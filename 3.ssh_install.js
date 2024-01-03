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

    bassh.verbose = true

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

    async function fileExists(file){
        let res = await bassh.cmd('[ -d '+file+' ] && echo "exists"')
        return res.stdout.startsWith('exists')
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

        // Create archiso directory
        const archisoPath = '/home/archiso/'
        await bassh.cmd('[ -d '+archisoPath+' ] && echo "The directory exists." || mkdir '+archisoPath)

        const archlivePath = archisoPath + 'archlive/'

        if(!(await fileExists(archlivePath))){
            // Copy installation profile
            await bassh.cmd('cp -r /usr/share/archiso/configs/releng/ '+archisoPath+'archlive')
        }
        else {
            console.log("archlive path already exists")
        }

        await bassh.cmd('cat '+archisoPath+'archlive/pacman.conf')
    }
}