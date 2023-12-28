import * as vbox from './vbox.js'
import * as cmds from './cmds.js'

vbox.props.password = 'admin'
vbox.props.bashPath = '/bin/bash'

async function connectToVMNetwork(chosenInt=null){
    if(!chosenInt){
        await vbox.waitForEcho()

        let res = await vbox.vmExec("ip link")
        let interfaces = cmds.readIpLink(res.stdout)

        for(let int in interfaces){
            if(int.startsWith('en')){
                chosenInt = int 
                break
            }
        }
    }

    // Set up virtual network
    await vbox.vmExec("ip link set "+chosenInt+" up")

    await vbox.vmExec('ip addr add 192.168.137.10/24 dev '+chosenInt)
    await vbox.sleep(vbox.waitAfterCmd)

    await vbox.vmExec("ip route add default via 192.168.137.1") // add gateway

    await vbox.vmExec("ip link set "+chosenInt+" up") // up again
    await vbox.sleep(vbox.waitAfterLongCmd)

    let ifConfigRes = await vbox.vmExec('ifconfig')
    let res = cmds.readIfConfig(ifConfigRes.stdout)

    res.chosenInt = chosenInt

    return res
}

async function install_connection(){
    await vbox.waitForEcho()

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

    await connectToVMNetwork(chosenInt)

    // Install base tools for environment recognition
    await cmds.makeCmdPacmanInstall("which net-tools iputils", vbox)
    await vbox.sleep(vbox.waitAfterCmd)

    //await cmds.makeCmdCreateUser(vbox, 'user', 'pass')

    return
}

async function install_kdePlasma(){
    await vbox.sleep(vbox.waitAfterCmd)

    await cmds.makeCmdPacmanUpdateSystem(vbox)
    await vbox.sleep(vbox.waitAfterCmd)

    await cmds.makeCmdPacmanInstall('plasma kde-applications sddm', vbox)
    await vbox.sleep(vbox.waitAfterLongCmd)

    await vbox.vmExec('systemctl enable sddm.service')
    await vbox.sleep(vbox.waitAfterCmd)
    await vbox.vmExec('systemctl start sddm.service')
    await vbox.sleep(vbox.waitAfterLongCmd)

    vbox.vmExec('reboot')
}

async function install_env(){
    await install_connection()

    await cmds.makeCmdCreateUser(vbox, 'user', 'pass')
    await enableSshd()

    //await install_kdePlasma()

    return
}

async function enableSshd(){
    let resSshdStatus = await vbox.vmExec('systemctl status sshd')

    if(resSshdStatus.stdout.includes('Active: inactive') || true){
        
        let defSshd = await vbox.vmExec('ls /etc/ssh/sshd_config.default')
        if(!defSshd.stdout)
            await vbox.vmExec('cp /etc/ssh/sshd_config /etc/ssh/sshd_config.default')
        else
            await vbox.vmExec('cp /etc/ssh/sshd_config.default /etc/ssh/sshd_config')
    
        await vbox.vmExec('echo -e "\\nPort 22\\n" >> /etc/ssh/sshd_config')
        await vbox.vmExec('echo -e "PasswordAuthentication yes\\n" >> /etc/ssh/sshd_config')
        //await vbox.vmExec('echo -e "PermitRootLogin yes\\n" >> /etc/ssh/sshd_config')
        await vbox.vmExec('echo -e "AllowUsers user\\n" >> /etc/ssh/sshd_config')
        await vbox.vmExec('echo -e "AllowGroups wheel\\n" >> /etc/ssh/sshd_config')
        await vbox.vmExec('systemctl restart sshd')

        await vbox.vmExec('systemctl start sshd')
        await vbox.vmExec('systemctl enable sshd')
        await vbox.sleep(vbox.waitAfterCmd)
    }
}

async function enableSudo(){
    await cmds.makeCmdPacmanInstall('sudo', vbox)
    await vbox.sleep(vbox.waitAfterCmd)
    await vbox.vmExec('echo -e "username ALL=(ALL) ALL\\n%wheel ALL=(ALL) ALL" > /etc/sudoers')
}

async function temp(){
    //await install_connection()

    //await vbox.vmExec("rm /var/lib/pacman/db.lck")

    //await vbox.vmExec('setxkbmap it')
    //await vbox.vmExec("ifconfig")

    //let ifConfigRes = await vbox.vmExec('ifconfig')
    //let ints = cmds.readIfConfig(ifConfigRes.stdout)

    //await cmds.makeCmdPacmanInstall("iputils", vbox)

    //await connectToVMNetwork()

    await enableSudo()

    return
}

//install_env()
temp()