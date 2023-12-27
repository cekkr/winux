import * as vbox from './vbox.js'
import * as cmds from './cmds.js'
  
const waitAfterLongCmd = vbox.waitAfterLongCmd

function readFDiskL(stdout){
    let lines = stdout.split('\n')
    
    let disks = {}

    // Useless, but are there. Sorry real programmers.
    let nLine = 0
    let nPart = 0
    let readingPartitions = false

    let disk = {}

    let justFlushed = true
    function flushDisk(){
        if(!justFlushed){
            if(disk.path){
                disks[disk.path] = disk
                disk = {}
                justFlushed = true
                readingPartitions = false
            }
        }
    }

    let njump = 0
    let table = []
    for(let line of lines){
        if(line){
            justFlushed = false 

            if(njump == 1){
                njump = 0

                table = line.split(' ').filter((e) => e !== "")

                if(table[0] == 'Device'){ 
                    readingPartitions = true
                    disk.parts = []
                    continue
                }
            }

            if(!readingPartitions){
                let sl = line.split(':')

                if(sl[0].startsWith('Disk /')){
                    disk.path = sl[0].split(' ')[1]

                    let props = sl[1].split(',')

                    for(let p in props){
                        let prop = props[p].substring(1, props[p].length)
                        switch(p){
                            case '0': 
                                disk.size = prop
                                break;
                            case '1':
                                disk.sizeBytes = prop
                                break;
                            case '2': 
                                disk.sectors = prop 
                                break
                        }
                    }
                }
                else {
                    disk[sl[0]] = sl[1]
                }
            }
            else {
                let isize = table.indexOf('Sectors')
                let row = line.split(' ').filter((e) => e !== "")
                
                disk.parts.push({
                    path: row[0],
                    size: row[isize]
                })
            }

            nLine++
        }
        else {
            njump++

            if(njump > 1){
                flushDisk()
                nPart++
                nLine = 0
                njump = 0
            }
        }
    }

    flushDisk()
    
    return disks
}

async function vmChrootExec(cmd){
    cmd = cmd.replaceAll('"','\\"')

    cmd = 'arch-chroot /mnt /bin/bash -c "'+cmd+'"'
    await vbox.vmExec(cmd)
}

// Example usage
async function install_boot(){
    await vbox.closeSessions()

    let res = await vbox.vmExec("cat /sys/firmware/efi/fw_platform_size")
    let hasEfi = res.stdout.startsWith('64')

    if(hasEfi)
        console.log('Has EFI!')
    else 
        console.log('No EFI...')

    // Connect to internet
    await vbox.vmExec("ip link")

    // Update time 
    await vbox.vmExec("timedatectl")

    // Partitions
    let rFDisk = await vbox.vmExec("fdisk -l")
    let disks = readFDiskL(rFDisk.stdout)

    console.log("disks: ", disks)

    let disk = '/dev/sda'
    
    let diskStatus = disks[disk].parts != undefined

    // Delete partition if they already exists
    if(diskStatus){
        console.log("Deleting existing partitions...")

        let fdiskCmds = [
            'd',
            '',
            'd',
            '',
            'w'
        ]

        let cmd = cmds.composeInAppCommands('fdisk '+disk, fdiskCmds)
        
        await vbox.vmExec(cmd);

        await vbox.sleep(waitAfterLongCmd)
        rFDisk = await vbox.vmExec("fdisk -l " + disk)
        disks = readFDiskL(rFDisk.stdout)

        await vbox.sleep(waitAfterLongCmd)

        diskStatus = false
    }

    // Create partitions:
    if(!diskStatus){
        console.log("Writing partitions...")

        let fdiskCmds = [
            'n',
            'p',
            '', // partition number
            '', // first sector
            '+500M', // last sector

            'n',
            'p',
            '', // partition number
            '', // first sector
            '', // rest of partitions

            'p', // print
            'w', // write
        ]

        //let fdiskCmdsSeries = fdiskCmds.join('\\n')
        //let cmd = 'echo -e "'+fdiskCmdsSeries+'" | fdisk ' + disk

        let cmd = cmds.composeInAppCommands('fdisk '+disk, fdiskCmds)
        
        let writeDiskRes = await vbox.vmExec(cmd);

        await vbox.sleep(waitAfterLongCmd)
        rFDisk = await vbox.vmExec("fdisk -l " + disk)
        disks = readFDiskL(rFDisk.stdout)
    }

    // retrieve disk info
    let diskInfo = disks[disk]

    let mainPath = ''
    let bootPath = ''

    // create partitions
    let parts = diskInfo.parts 
    for(let p in parts){
        let part = parts[p]

        switch(p){
            case '0':
                await vbox.vmExec("mkfs.fat -F 32 "+part.path)
                bootPath = part.path
                break;

            case '1':
                await vbox.vmExec("mkfs.ext4 "+part.path)
                mainPath = part.path
                break;
        }
    }

    await vbox.sleep(waitAfterLongCmd)
    await vbox.vmExec("mount "+mainPath+" /mnt")
    await vbox.sleep(vbox.waitAfterCmd)
    await vbox.vmExec("mount --mkdir "+bootPath+" /mnt/boot")

    // install linux
    await vbox.sleep(waitAfterLongCmd)
    let linuxRes = await vbox.vmExec("pacstrap -K /mnt base linux linux-firmware")
    await vbox.sleep(waitAfterLongCmd)

    // Configure the system
    await vbox.vmExec("genfstab -U /mnt >> /mnt/etc/fstab")
    await vbox.sleep(waitAfterLongCmd)

    //await vbox.vmExec("arch-chroot /mnt") // enters in chroot
    
    // time zone
    await vmChrootExec("ln -sf /usr/share/zoneinfo/Europe/Rome /etc/localtime")
    await vmChrootExec("hwclock --systohc")

    // locale
    await vmChrootExec("locale-gen")
    await vbox.sleep(waitAfterLongCmd)

    // set language
    await vmChrootExec('echo -e "LANG=en_US.UTF-8" > /etc/locale.conf')

    // set keyboard
    await vmChrootExec('echo -e "KEYMAP=it" > /etc/locale.conf')

    // grub install
    await vmChrootExec('pacman -S --noconfirm grub efibootmgr')
    await vbox.sleep(waitAfterLongCmd)

    await vmChrootExec("grub-install --target=x86_64-efi --efi-directory=/boot --bootloader-id=GRUB")
    await vbox.sleep(waitAfterLongCmd)

    await vmChrootExec("grub-mkconfig -o /boot/grub/grub.cfg")

    // Set root password
    let passwdCmd = [
        'admin',
        'admin'
    ]

    let cmd = cmds.composeInAppCommands('passwd', passwdCmd)
    await vmChrootExec(cmd);

    // set hostname
    await vmChrootExec('echo -e "winux" > /etc/hostname')

    // set hostname
    await vmChrootExec('echo -e "\\n127.0.1.1 winux.localdomain winux\\n" >> /etc/hosts')

    // dns
    await vmChrootExec('systemctl enable --now systemd-resolved.service')  
    await vmChrootExec('echo -e "[Resolve]\\nDNS=8.8.8.8 8.8.4.4\\n" > /etc/systemd/resolved.conf')
    await vbox.vmExec('systemctl restart systemd-networkd')
    
    // install virtualbox
    await vmChrootExec("pacman -Syu --noconfirm virtualbox-guest-utils")
    await vmChrootExec("systemctl enable --now vboxservice")  

    // install openssh
    await vmChrootExec("pacman -Syu --noconfirm openssh")  
    await vmChrootExec("systemctl start sshd")  
    await vmChrootExec("systemctl enable sshd")  
}

async function install_nodejs(){
    // Install node
    res = await vbox.vmExec("sudo pacman -Syu --noconfirm nodejs")
    console.log("Node install res: ", res.stdout)
}

async function temp(){

    //:: force pacman unlock
    await vmChrootExec("rm /var/lib/pacman/db.lck")
    
}

//todo: /dev/sda is not obtained but costant

install_boot()
//temp()

//vbox.closeSessions()
