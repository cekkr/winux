const { exec } = require('child_process');

const vmName = "Arch Linux"; // Replace with your VM's name

// Function to execute a command in the VM
function vmExec(command) {      
    return new Promise((res, err)=>{   
        setTimeout(()=>{
            console.log("Executing: " + command)
            const vboxCommand = `VBoxManage guestcontrol "Arch Linux" run --exe "/bin/bash" --username "root" --password "" --wait-stderr --wait-stdout -- -c "${command}"`;

            exec(vboxCommand, (error, stdout, stderr) => {

                if(stderr) console.error(stderr)
                if(stdout) console.log(stdout)

                if ((!stdout && !stderr) && error) {
                    throw error
                }

                res({stdout, stderr});
            });
        }, 100);
    })
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

    return
    // Install node
    res = await vmExec("sudo pacman -Syu --noconfirm nodejs")
    console.log("Node install res: ", res)
}

main()
