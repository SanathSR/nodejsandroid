# API
`list`
`downloadSpecific?api=downloadSpecific&sanath=ns&date=`
`download?api=download&sanath=ns&date=all`
`delete?api=delete&sanath=ns&folder=`

# Deploy to VPS
- Login to VPS
`ssh root@<ipaddress>`

- Navigate to folder
`cd nodejsandroid`

- Pull from git
`git pull origin main`

- Install npm
`npm i`

- List the pm2
`pm2 list`

- stop the running process
`pm2 stop <name or id>`

- Start new process (this uses script in package.json)
`pm2 start npm --name <processname> -- run start`

- Save the pm2
`pm2 save`

- Check status of pm2
`pm2 status`

- optional Delete pm2 process
`pm2 delete <id|name>`

## ReDeploy Aram
- Login to VPS
`ssh root@<ipaddress>`

- Navigate to folder
`cd nodejsandroid`

- Pull from git
`git pull origin main`

- Install npm
`npm i`

- List the pm2
`pm2 list`

- Restart pm2
`pm2 restart <app_name_or_id>`  

## Copy Files 
- from Local to VPS
`scp D:\sanath.apk root@<ipaddress>:/root/nodejsandroid/APKS`

- from VPS to Local
`scp root@<ipaddress>:/root/nodejsandroid/APKS D:\`
