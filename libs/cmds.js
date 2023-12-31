
export function composeInAppCommands(cmd, cmds){
    let res = '('

    for(let c of cmds){
        res += 'echo -e "'+c+'";'
        res += 'sleep 0.5;'
    }

    res += ') | ' + cmd 

    return res
}

async function execCmdIfVbox(vbox, cmd){
    if(vbox){
        return await vbox.vmExec(cmd)
    }
}

export async function makeCmdPacmanInstall(packages, vbox=null){
    let cmd = 'pacman -Sy --noconfirm ' + packages
    await execCmdIfVbox(vbox, cmd)
    return cmd
}

export async function makeCmdPacmanUpdateSystem(vbox=null){
    let cmd = 'pacman -Syu'
    await execCmdIfVbox(vbox, cmd)
    return cmd
}

export async function makeCmdCreateUser(vbox, user, pass){
    await vbox.vmExec("useradd -m -G wheel "+user)

    let passwdCmds = [
        pass,
        pass
    ]

    let passwdCmd = composeInAppCommands("passwd "+user, passwdCmds)
    await vbox.vmExec(passwdCmd)
}

export function readIpLink(stdout){
    let res = {}

    let n = 1
    let cur = null

    function flush(){
        if(cur && cur.name) res[cur.name] = cur
        cur = {p:[]}
    }

    let lines = stdout.split('\n')

    let l = 0
    for(let line of lines){
        if(line){
            let predictStart = n+':'
            if(line.startsWith(predictStart)){
                flush()
    
                line = line.substring(n.toString().length+2)
    
                cur.n = n++
                l = 0
            }

            if(l==0){
                let div = line.split(':')
                cur.name = div[0]
                cur.p.push(div[1].split(' '))
            }
            else if(l==1){
                let div = line.split(' ').filter((e)=>{return e != ''})
                cur.p.push(div)
            }

            l++
        }
    }

    flush()

    return res
}

export function readIfConfig(stdout){
    let res = {}

    let n = 1
    let cur = null

    function flush(){
        if(cur && cur.name) res[cur.name] = cur
        cur = {}
    }

    let lines = stdout.split('\n')

    let l = 0
    for(let line of lines){
        if(line){
            if(!line.startsWith(" ") && line.includes(':')){
                flush()
                cur.n = n++
                l = 0
            }

            if(l==0){
                let div = line.split(':')
                cur.name = div[0]

                line = div[1]
            }
            
            let div = line.split(' ').filter((e)=>{return e != ''})

            if(div[0]=='RX' || div[0]=='TX'){
                let name = div.splice(0, 2).join(' ')
                cur[name] = div.join(' ')
            }
            else {
                let prop = ''
                for(let i=0; i<div.length; i++){
                    let d = div[i]

                    if(i%2==0){
                        prop = div[i]
                    }
                    else { 
                        cur[prop] = div[i]
                    }
                }
            }

            l++
        }
    }

    flush()

    return res
}