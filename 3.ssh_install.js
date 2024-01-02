import * as config from './config.js'
import {Bassh} from 'bassh'

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