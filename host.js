const { exec } = require('child_process');

const vmName = "Arch Linux"; // Replace with your VM's name

// Function to execute a command in the VM
function vmExec(command) {      
    return new Promise((res, err)=>{   
        console.log("Executing: " + command)
        command = command.replaceAll('"','\\"')
        const vboxCommand = `VBoxManage guestcontrol "Arch Linux" run --exe "/bin/bash" --username "root" --password "" --wait-stderr --wait-stdout -- -c "${command}"`;

        exec(vboxCommand, (error, stdout, stderr) => {

            if(stderr) console.error(stderr)
            if(stdout) console.log(stdout)

            if ((!stdout && !stderr) && error) {
                    console.warn("Retry VBox command")
                    setTimeout(()=>{
                    (async ()=>{
                        let r = await vmExec(command)
                        res(r)
                    })()
                }, 100);
            }
            else {
                res({stdout, stderr});
            }
        });
    })
}

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

function composeInAppCommands(cmd, cmds){
    let res = '('

    for(let c of cmds){
        res += 'echo -e "'+c+'";'
        res += 'sleep 0.25;'
    }

    res += ') | ' + cmd 

    return res
}

// Example usage
async function main(){
    let res = await vmExec("cat /sys/firmware/efi/fw_platform_size")
    let hasEfi = res.stdout.startsWith('64')

    if(hasEfi)
        console.log('Has EFI!')
    else 
        console.log('No EFI...')

    // Connect to internet
    await vmExec("iplink")

    // Update time 
    await vmExec("timedatectl")

    // Partitions
    let rFDisk = await vmExec("fdisk -l")
    let disks = readFDiskL(rFDisk.stdout)

    console.log("disks: ", disks)

    let disk = '/dev/sda'
    
    let diskStatus = disks[disk].parts != undefined

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

        let cmd = composeInAppCommands('fdisk '+disk, fdiskCmds)
        
        let writeDiskRes = await vmExec(cmd);

        rFDisk = await vmExec("fdisk -l " + disk)
        disks = readFDiskL(rFDisk.stdout)
    }

    // retrieve disk info
    let diskInfo = disks[disk]

    // create partitions
    let parts = diskInfo.parts 
    for(let p in parts){
        let part = parts[p]

        switch(p){
            case '0':
                await vmExec("mkfs.fat -F 32 "+part.path)
                await vmExec("mount "+part.path+" /mnt")
                break;

            case '1':
                await vmExec("mkfs.ext4 "+part.path)
                await vmExec("mount --mkdir "+part.path+" /mnt")
                break;
        }
    }

    // install linux
    let linuxRes = vmExec("pacstrap -K /mnt base linux linux-firmware")

    // Configure the system
    vmExec("genfstab -U /mnt >> /mnt/etc/fstab")
    vmExec("arch-chroot /mnt")
    
    vmExec("ln -sf /usr/share/zoneinfo/Europe/Rome /etc/localtime")
    vmExec("hwclock --systohc")

    return
    // Install node
    res = await vmExec("sudo pacman -Syu --noconfirm nodejs")
    console.log("Node install res: ", res.stdout)
}

main()
