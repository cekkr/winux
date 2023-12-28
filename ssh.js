import {Client} from 'ssh2'

import * as config from './config.js'
import * as installedBoot from './libs/installedBoot.js'

export let ssh = {}

const conn = new Client();
const sshConfig = {
  host: config.IP,
  port: 22,
  username: 'user',
  password: 'pass' // or use privateKey for key-based authentication
};

function strRemLastN(str){
    if(str.endsWith('\n'))
        return str.substring(0, str.length-1)

    return str
}

let msgNo = 0
let sudoSu = 0

let sentCmd = false
ssh.cmd = (cmd)=>{
    sentCmd = true
    console.log("SSH Send: ", cmd)

    ssh.sentTime = Date.now()

    ssh.stdout = ''
    ssh.stderr = ''

    ssh.stream.write(cmd+'\n')

    return new Promise((res, err)=>{  
        ssh.endCmd = () =>{
            ssh.endCmd = null

            let out = strRemLastN(ssh.stdout)
            let err = strRemLastN(ssh.stderr)

            ssh.stdout = ''
            ssh.stderr = ''

            res({stdout: out, stderr: err})
        }
    })
}

ssh.checkEnd = ()=>{
    clearTimeout(ssh.endTimeout)
    ssh.endTimeout = setTimeout(
        ()=>{
            if(ssh.endCmd) ssh.endCmd()
        }, (ssh.ping*2)+100
    )
}

ssh.out = (out)=>{
    ssh.stdout += out + '\n'
    ssh.checkEnd()
}

ssh.err = (out)=>{
    ssh.stderr += out
    ssh.checkEnd()
}

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.shell((err, stream) => {
        if (err) throw err;
        
        stream.on('close', () => {
            console.log('Stream :: close');
            conn.end();
        }).on('data', (data) => {
            let str = data.toString()

            let lines = str.split('\r\n')

            lines = lines.filter((el)=>{ return el != '' })
            if(lines.length == 0) lines.push('')
        
            for(let line of lines){

                line = line.replace('[?2004l','')

                if(msgNo == 1){
                    sudoSu = 1
                    ssh.cmd('sudo su');
                }
                else {
                    if(line.includes('winux') && (line.endsWith(']$ ') || line.endsWith(']# '))){
                        if(sudoSu == 2){
                            console.log('(SUDO SU READY)')
                            ssh.ready = true 
                            if(ssh.onReady) ssh.onReady()
                            sudoSu = 3
                        }
                        else {
                            if(ssh.endCmd) ssh.endCmd()
                        }

                        continue
                    }

                    if(!sentCmd){
                        if(line){
                            if(sudoSu == 3){
                                console.log(line)  
                                ssh.out(line)
                            }
                            else if(sudoSu == 1){
                                ssh.cmd('pass')
                                sudoSu = 2
                            }
                        }
                    }
                    else {
                        // echo
                        sentCmd = false
                        let now = Date.now()
                        let ping = now - ssh.sentTime
                        ssh.ping = (ssh.ping + ping) / 2
                    }
                }

                msgNo++
            }
        

        }).stderr.on('data', (data) => {
            let str = data.toString()
            console.error(str);

            ssh.err(str.replaceAll('\r\n','\n'))
        });

        ssh.stream = stream
    });
}).connect(sshConfig);

ssh.onReady = async ()=>{
    let res = await ssh.cmd('echo ciao')
    console.log('req res ', res)
}