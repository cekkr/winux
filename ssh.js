import {Client} from 'ssh2'
import * as config from './config.js'

const conn = new Client();
const sshConfig = {
  host: config.IP,
  port: 22,
  username: 'user',
  password: 'pass' // or use privateKey for key-based authentication
};

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.shell((err, stream) => {
        if (err) throw err;
        
        stream.on('close', () => {
            console.log('Stream :: close');
            conn.end();
        }).on('data', (data) => {
            console.log('OUTPUT: ' + data.toString());
        });

        // Send a command without ending the stream
        stream.write('ls /\n');

        // You can send more commands later by calling stream.write again
        // For example, after some time or based on some conditions:
        setTimeout(() => {
            stream.write('echo "Another command"\n');
        }, 5000); // Execute another command after 5 seconds
    });
}).connect(sshConfig);