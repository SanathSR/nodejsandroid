# API

- ```bash
  list
- ```bash
  downloadSpecific?api=downloadSpecific&sanath=ns&date=
- ```bash
  download?api=download&sanath=ns&date=all
- ```bash
  listText
- ```bash
  getLogs?api=getLogs&sanath=ns&filename=
- ```bash
  delete?api=delete&sanath=ns&folder=

# Deploy to VPS
- Login to VPS
  ```bash
  ssh root@<ipaddress>

- Navigate to folder
  ```bash
  cd nodejsandroid

- Pull from git
  ```bash
  git pull origin main

- Install npm
  ```bash
  npm i

- List the pm2
  ```bash
  pm2 list

- stop the running process
  ```bash
  pm2 stop <name or id>

- Start new process (this uses script in package.json)
  ```bash
  pm2 start npm --name <processname> -- run start

- Save the pm2
  ```bash
  pm2 save

- Check status of pm2
  ```bash
  pm2 status

- optional Delete pm2 process
  ```bash
  pm2 delete <id|name>

## ReDeploy Aram
- Login to VPS
  ```bash
  ssh root@<ipaddress>

- Navigate to folder
  ```bash
  cd nodejsandroid

- Pull from git
  ```bash
  git pull origin main

- Install npm
  ```bash
  npm i

- List the pm2
  ```bash
  pm2 list

- Restart pm2
  ```bash
  pm2 restart <app_name_or_id>  

## Copy Files 

- from Local to VPS
  ```bash
  scp D:\sanath.apk root@<ipaddress>:/root/nodejsandroid/APKS

- from VPS to Local
  ```bash
  scp root@<ipaddress>:/root/nodejsandroid/APKS D:\

- from VPS to Local (all files)
  ```bash
  scp -r root@<ipaddress>:/root/nodejsandroid/FILES D:\NS
