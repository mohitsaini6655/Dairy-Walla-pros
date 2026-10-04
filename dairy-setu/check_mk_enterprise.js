import dns from 'dns';
import net from 'net';

async function main() {
  const host = 'isslablpzbqyubuxtksc.supabase.co';
  
  console.log(`Resolving DNS for ${host}...`);
  dns.lookup(host, (err, address, family) => {
    if (err) {
      console.error('DNS lookup failed:', err.message);
      return;
    }
    console.log(`Resolved IP: ${address} (Family: v${family})`);
    
    console.log(`Connecting to ${address}:443...`);
    const socket = new net.Socket();
    socket.setTimeout(5000);
    
    socket.connect(443, address, () => {
      console.log('Successfully connected to port 443.');
      socket.destroy();
    });
    
    socket.on('error', (connErr) => {
      console.error('Connection failed:', connErr.message);
    });
    
    socket.on('timeout', () => {
      console.error('Connection timed out.');
      socket.destroy();
    });
  });
}

main().catch(err => console.error(err));
