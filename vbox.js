import { exec, spawn } from 'child_process';

const vmName = "ArchLinux"; // Replace with your VM's name

export const waitAfterLongCmd = 10000
export const waitAfterCmd = 2000

const useSpawn = true

export let props = {
    user: 'root',
    password: '',
    bashPath: '/usr/bin/zsh'
}

export function vboxManage(cmd){
    return new Promise((res, err)=>{   
        const vboxCommand = `VBoxManage guestcontrol "${vmName}" ${cmd}`;
        exec(vboxCommand, (error, stdout, stderr) => {

            if(stderr) console.error(stderr)
            if(stdout) console.log(stdout)

            res({stderr, stdout})
        });
    })
}

// Function to execute a command in the VM
let cmdAttempt = 0
export function vmExec(command) {      
    return new Promise((res, err)=>{   
        console.log("Executing: " + command)
        //command = command.replaceAll('"','\\"')

        if(!command.startsWith("echo START; ")){
            command = "echo START; " + command + "; echo BYEBYEND"
        }
        
        if(useSpawn){
            const args = [];
            args.push('guestcontrol')
            args.push(vmName)
            args.push('run')

            args.push('--exe')
            args.push(props.bashPath)

            args.push('--username')
            args.push(props.user)

            args.push('--password')
            args.push(props.password)

            args.push('--wait-stderr')
            args.push('--wait-stdout')

            args.push('--')
            args.push('-c')
            args.push(command)
            
            let stdout = ''
            let stderr = ''

            // Spawn the child process
            const childProcess = spawn('VBoxManage', args);

            // Capture and display stdout
            let started = false
            let ended = false
            childProcess.stdout.on('data', (data) => {
                let str = data.toString()
                if(!started){
                    if(str.startsWith('START')){
                        str = str.substring(6)
                        started = true
                    }

                    if(str.endsWith('BYEBYEND')){
                        ended = true
                        str = str.substring(0, str.length - 8)
                    }
                }
                
                if(started){
                    console.log(str)
                    stdout += str
                }
                else {
                    if(str){
                        vboxManageErr(str)
                    }
                }
            });

            async function vboxManageErr(err){

                if(err.includes("Maximum number of concurrent guest sessions"))
                    await vboxManage("closesession --all")

                console.error(`VBoxManager process error: ${err}`);
                console.warn("Retry VBox command")

                /*if(cmdAttempt++ == 3 || err.includes("failed to run command '/bin/bash': No such file or directory")){
                    if(!bashPath.startsWith('/usr')){
                        bashPath = '/usr'+bashPath
                        console.log("moving to /usr/bin/")
                    }
                }*/

                setTimeout(()=>{
                    (async ()=>{
                        let r = await vmExec(command)
                        res(r)
                    })()
                }, waitAfterCmd/2);
            }

            // Handle process exit
            childProcess.on('close', (code) => {
                console.log("VBoxManage close code ", code)
                if(stderr.startsWith('VBoxManage'))
                    return vboxManageErr(stderr)

                if(!ended){
                    return vboxManageErr("NOT REALLY ENDED")
                }

                cmdAttempt = 0

                setTimeout(()=>{
                    res({stdout, stderr})
                }, waitAfterCmd);
            });

            // Capture and display stderr
            childProcess.stderr.on('data', (data) => {
                if(data.toString().includes("failed to run command ‘/bin/bash’: No such file or directory")){
                    return vboxManageErr(data)
                }

                console.error(data.toString())
                stderr += data.toString()
            });

            childProcess.on('error', (err) => {
                if(!stderr && !stdout){
                    vboxManageErr(err.message)
                }
            });
        }
    })
}

export async function closeSessions(){
    console.log("trying to clear VBoxManage sessions")
    vboxManage("closesession --all")
    await sleep(2000)
}

export function sleep(ms){
    return new Promise((res)=>{
        setTimeout(
            ()=>{
                res()
            }, ms
        )
    })
}

export async function waitForEcho(){
    while(!(await vmExec("echo ciao")).stdout.includes("ciao"))
        console.log("ping without pong");

    return 'ok'
}