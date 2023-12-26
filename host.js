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

    let disk = {}

    let justFlushed = true
    function flushDisk(){
        if(!justFlushed){
            if(disk.path){
                disks[disk.path] = disk
                disk = {}
                justFlushed = true
            }
        }
    }

    for(let line of lines){
        if(line){
            justFlushed = false 

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

            nLine++
        }
        else {
            flushDisk()
            nPart++
            nLine = 0
        }
    }

    flushDisk()
    
    return disks
}

async function checkDiskStatus(disk){
    // Check partition status:
    //let cmd = 'echo -e "'+['p','q'].join('\\n')+'" | fdisk /dev/sda' // just for testing purposes
    let cmd = 'fdisk -l ' + disk
    let res = await vmExec(cmd)

    let out = res.stdout 
    let lines = out.split('\n')
    
    return lines.length == 5
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
    
    let diskStatus = await checkDiskStatus(disk)

    // Create partitions:
    if(!diskStatus){
        let fdiskCmds = [
            'n',
            'p',
            '\n', // partition number
            '\n', // first sector
            '+500M', // last sector

            'n',
            'p',
            '\n', // partition number
            '\n', // first sector
            '\n', // rest of partitions

            'p', // print
            'w', // write
        ]

        let fdiskCmdsSeries = fdiskCmds.join('\\n')
        let cmd = 'echo -e "'+fdiskCmdsSeries+'" | fdisk -w /dev/sda'

        await vmExec(cmd);
    }

    return
    // Install node
    res = await vmExec("sudo pacman -Syu --noconfirm nodejs")
    console.log("Node install res: ", res.stdout)
}

main()
