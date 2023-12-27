import * as vbox from './vbox.js'
import * as cmds from './cmds.js'

vbox.props.password = 'admin'
vbox.props.bashPath = '/bin/bash'

async function install_env(){
    await vbox.vmExec("echo hello")

    let res = await vbox.vmExec("ip link")
    let interfaces = cmds.readIpLink(res.stdout)

    let chosenInt = null
    for(let int in interfaces){
        if(int.startsWith('en')){
            chosenInt = int 
            break
        }
    }

    await vbox.vmExec("ip link set "+chosenInt+" up")

    return
}

install_env()