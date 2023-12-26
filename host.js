const { exec } = require('child_process');

const vmName = "Arch Linux"; // Replace with your VM's name

// Function to execute a command in the VM
function vmExec(command) {      
    return new Promise((res, err)=>{        
        const vboxCommand = `VBoxManage guestcontrol "Arch Linux" run --exe "/bin/bash" --username "root" --password "" --wait-stderr --wait-stdout -- -c "${command}"`;

        exec(vboxCommand, (error, stdout, stderr) => {
            if (error) {
                err({error, stderr});
                return;
            }
            res({stdout, stderr});
        });
    })
}

// Example usage
async function main(){
    let res = await vmExec("ls /")
    console.log("res: ", res)
}

main()
