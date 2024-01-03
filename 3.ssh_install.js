import * as config from './config.js'
import {Bassh} from 'bassh'

import * as ping from 'ping'
import * as installedBoot from './libs/installedBoot.js'

const host = 'example.com'; // Replace with the hostname or IP address of the server you want to ping.

ping.sys.probe(config.IP, async (isAlive) => {
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

    bassh.onReady = async function(){
        console.log("bash ready")
    
        let sudoRes = await bassh.sudoSu('pass')
        console.log("Sudo su: ", sudoRes)

        if(sudoRes.wrongPassword){
            console.error("Wrong sudo password.");
            return;
        }
    
        // Real time output
        let pres = bassh.cmd('echo meow')
        
        pres.out = async (out)=>{
        console.log("Real time stdout: ", out)
        }
            
        pres.err = async (out)=>{
        console.log("Real time stderr: ", out)
        }
        
        pres = await pres;
        console.log("bash res: ", pres)
    }
}