## Powrum
In the past, I've built a forum into another website. Work was slowly put into it over the years. I've decided to extract the forum and make it an independent forum software. That said, much of the early commit history is not included. The forum was originally built statically, but I am now working to make it dynamic. E.g to be able to change what forum categories exist or change the forums name.

## Pre-requisites
You must have the following installed in order to continue with installation

- This runs on Node.js. Powrum is constantly updating, so be sure to install the latest version for a seamless experience.
Node.js LTS : https://nodejs.org/en/download

- The only database we support is MongoDB. We prefer Mongo because of its mostly automatic database configuration.
https://www.mongodb.com/try/download/community

You must have the following to continue with setup

- Mailgun configuration ( https://mailgun.com )
    * API key
    * Mailgun domain
    
- The Node.js process requires read and write permissions. Such as to create the critical .env file or allow users to upload a profile picture.
   * This can be problematic for limited environments such as Replit.

## Installation
Run these commands in your CLI (cmd.exe, terminal)

1. Clone the repository
`> git clone https://github.com/2JJ1/Pow-Forum`
2. Install the NPM packages
`> npm install`

## Running the process
Simply run the server.js file. 
`> node server.js`

It is recommended to use a production manager such as PM2.
`> npm install -g pm2`
`> pm2 start server.js`

When you run the server, the console will output the URL you can visit to view the website.
By default: `http://localhost:8087`

If running from your personal computer, you can simply visit that URL on your browser. 

If running from a cloud server like in a production setup, proxy to that URL using an HTTP server(I.e NGINX, Apache). Make sure your domain's DNS is pointing to your server's IP address. Then simply visit your website's domain.

## Configuration
When you first run the server, the website will display an initial configuration setup. Once complete, you will need to restart the website server in order to see the normal forum UI.

Though you may have completed the initial setup, you still need to continue configuring the forum. Such as to add an admin, 
setup API keys to make the premium subscription work, or to add forum categories.

Some optional configuration is done through the Powrum CLI(PF-CLI). To run PF-CLI, run the command
`> npm run cli`

### Adding an admin account
Forum admins can only be added through the PF-CLI. 
1. First you will need to visit the website in your browser and create an account. 
2. Once you have an account, run the PF-CLI command below and enter your username.
`> addadmin`

To remove an admin, run the PF-CLI command `> removeadmin`

### Adding/editing categories
Once you have an admin account as setup above, you should see a dashboard option in the website's navigation bar. Visit it and hopefully the rest is obvious.

## Running multiple Powrum on the same server
If you're going to run multiple instances of Powrum on the same server, you need to set some environment variables so the Powrum don't clash with eachother. For each of the Powrum, follow the steps below

1. Create a .env file in the root directory
2. Inside the .env file, supply `PORT` and `DATABASE_NAME` values. The values must be unique from the other running Powrum instances.
Example:
```.env
PORT=8088
DATABASE_NAME=MyDatabaseName
```

## Environment Variables
You can edit the .env file following the npm package, dotenv's, pattern
These changes will only take effect when you restart the process
You may find that a .env file already exists with automatically set values. You may ignore them or edit as you see fit.
```.env
#Modifying the source code? Use the "development" value to to disable some annoying features like captcha on login
NODE_ENV=production
#Change the session cookie's name. Changing this will result in existing login sessions to be unrecognized
SESSION_COOKIE_NAME=_PFSec
#The MongoDB database name this deployment will use. Necessary to set a unique name if running multiple deployments on the same server. This does not rename the database
DATABASE_NAME=db_powrum
#The HTTP port number this deployment will use. Necessary to set a unique port number if running multiple deployments on the same server
PORT=8087
````

## Updating Powrum
Before updating, refer to the repository's releases to check for breaking changes
You can expect breaking changes if the version's major has changed

Simply pull the repository
`> git pull origin`

## Migration
Follow these steps when changing your host server

### Migrating the database
Migrate your database using the Mongo CLI
1. Export the entire database
`> mongodump -d <database_name> -o <target_directory>`
2. On your new deployment, you can restore with
`> mongorestore -d <database_name> <target_directory>`
The default database name is db_powrum

### Migrating files
Copy over the following files to the same location in the new deployment

* User's profile pictures found in
`public/images/avatars`
* The .env file
`.env`
