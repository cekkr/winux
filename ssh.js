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
      console.log('OUTPUT: ' + data);
    });

    // Execute commands in sequence
    stream.end('ls -l\nexit\n'); // Add your commands here
  });
}).connect(sshConfig);