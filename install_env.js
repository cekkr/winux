import * as vbox from './vbox.js'
import * as cmds from './cmds.js'

vbox.props.password = 'admin'
vbox.props.bashPath = '/bin/bash'

async function install_connection(){
    let res = await vbox.vmExec("ip link")
    let interfaces = cmds.readIpLink(res.stdout)

    let chosenInt = null
    for(let int in interfaces){
        if(int.startsWith('en')){
            chosenInt = int 
            break
        }
    }

    // DHCP
    await vbox.vmExec('echo -e "[Resolve]\\nName='+chosenInt+'\\n\\n[Network]\\nDHCP=yes\\n" > /etc/systemd/network/20-wired.network')
    await vbox.vmExec('systemctl restart systemd-networkd')

    // DNS
    let resolv = await vbox.vmExec("cat /etc/resolv.conf")
    if(!resolv.stdout.includes("8.8.8.8")){
        await vbox.vmExec('echo -e "\\nnameserver 8.8.8.8\\n" >> /etc/resolv.conf')
    }

    // Set up virtual network
    await vbox.vmExec("ip link set "+chosenInt+" up")
    await vbox.vmExec('ip addr add 10.0.2.15/24 dev '+chosenInt)
    await vbox.vmExec("ip route add default via 10.0.2.1")

    // Install base tools for environment recognition
    await cmds.makeCmdPacmanInstall("which net-tools")

    return
}

async function install_env(){
    await install_connection()

    await cmds.makeCmdPacmanUpdateSystem(vbox)

    return
}

async function temp(){
   
}

//install_env()
temp()