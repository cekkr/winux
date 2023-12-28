import {ssh} from './libs/ssh.js'

ssh.onReady = async ()=>{
    let res = await ssh.cmd('echo ciao')
    console.log('req res ', res)
}

ssh.start()