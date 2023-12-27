import * as vbox from './vbox.js'
for (const prop in vbox) eval(prop+'= vbox.'+prop) // the lazy way

props.password = 'admin'

vmExec("echo hello")