import * as config from './config.js'
import {Bassh} from 'bassh'

import * as ping from 'ping'
import * as installedBoot from './libs/installedBoot.js'

ping.default.sys.probe(config.IP, async (isAlive) => {
    if(!isAlive){
        await installedBoot.connectToVMNetwork()
    }

    startBassh()
});

function startBassh(){
    const bassh = Bassh({
        host: config.IP,
        port: 22,
        username: 'user',
        password: 'pass' // or use privateKey for key-based authentication
    })

    async function pacmanInstallIfNotExists(pack){
        let checkRes = await bassh.cmd('pacman -Ql '+pack)

        if(checkRes.stdout.includes('was not found')){
            let instRes = bassh.cmd('pacman -Sy --noconfirm '+pack)

            instRes.out = async (out)=>{
                console.log("Install stdout: ", out)
            }

            instRes.err = async (out)=>{
                console.error("Install stderr: ", out)
            }
            
            return await instRes
        }

        return {alreadyInstalled: true}
    }

    bassh.onReady = async function(){
        console.log("bash ready")
    
        let sudoRes = await bassh.sudoSu('pass')
        console.log("Sudo su: ", sudoRes)

        if(sudoRes.wrongPassword){
            console.error("Wrong sudo password.");
            return;
        }

        await createArchiso()
    }

    async function createArchiso(){
        // Unlock pacman from previous operations
        let res = await bassh.cmd('rm /var/lib/pacman/db.lck')

        // Archiso
        res = await pacmanInstallIfNotExists("archiso")
        console.log("archiso install: ", res)
    }
}