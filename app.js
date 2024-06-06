const express = require('express')
var bodyParser = require('body-parser')
var aes256 = require('aes256');
var multer = require('multer');

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin,registerAndEnrollUser2 } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');
const { v4: uuidv4 } = require('uuid');
const{scryptSync, createCipheriv, createDecipheriv,X509Certificate} = require('crypto')
const {mkdirSync, existsSync,writeFileSync,createReadStream,statSync} = require('fs')

const channelName = 'mychannel';
const chaincodeName = 'sbri';
const mspOrg1 = 'Org1MSP';

const walletPath = path.join(__dirname, 'wallet');
const userId = 'appUser1';




var upload = multer({dest: 'uploads/'});
//var upload = multer({storage: multer.memoryStorage()});

const encrypt = (buffer) => {
	// More info: https://nodejs.org/api/crypto.html
	const algorithm = 'aes-192-cbc'
	const iv = Buffer.alloc(16, 0)
	const key = scryptSync('super strong password', 'salt', 24)

	
  
	const cipher = createCipheriv(algorithm, key, iv)
	return Buffer.concat([cipher.update(buffer), cipher.final()])
	
  }
  const decrypt = (buffer) => {

  }
  
  const saveEncryptedFile = (buffer, filePath, finalPath) => {
	
	if (!existsSync(filePath)) {
		console.log(`mkdir ${filePath}`)
	  	mkdirSync(filePath)
	}
	 writeFileSync(finalPath, buffer)
	
  }
 

function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}

const writeResponse = function writeResponse(res, response, status) {
  // sw.setHeaders(res);
  res.status(status || 200).send(JSON.stringify(response));
};

const writeError = function writeError(res, error, status) {
  // sw.setHeaders(res);
  res
    .status(error.status || status || 400)
    .send(JSON.stringify(_.omit(error, ["status"])));
};

var app = express()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))

// parse application/json
app.use(bodyParser.json())

// for parsing multipart/form-data
//app.use(upload.array()); 
app.use(express.static('public'));

app.use(function (err, req, res, next) {
	console.log('This is the invalid field ->', err.field)
	next(err)
})


const port = 3000
var ccp = null
var caClient = null
var wallet = null

app.get('/', async (req, res) => {


		// Create a new gateway instance for interacting with the fabric network.
		// In a real application this would be done as the backend server session is setup for
		// a user that has been verified.
		const gateway = new Gateway();

		try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
				wallet,
				identity: userId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);



			let result;

			//console.log('\n--> Evaluate Transaction: GetAssetsByRange, function use an open start and open end range to return assest1 to asset6');
			result = await contract.evaluateTransaction('GetAssetsByRange', '', '');
			//console.log(`*** Result: ${prettyJSONString(result.toString())}`);
      		writeResponse(res,result.toString(),200)

		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}
  

})


app.get('/asset/range/:start/:end', async (req, res) => {

	const start = req.params.start; 
	const end = req.params.end
	// Create a new gateway instance for interacting with the fabric network.
	// In a real application this would be done as the backend server session is setup for
	// a user that has been verified.
	const gateway = new Gateway();

	try {
		// setup the gateway instance
		// The user will now be able to create connections to the fabric network and be able to
		// submit transactions and query. All transactions submitted by this gateway will be
		// signed by this user using the credentials stored in the wallet.
		await gateway.connect(ccp, {
			wallet,
			identity: userId,
			discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
		});

		// Build a network instance based on the channel where the smart contract is deployed
		const network = await gateway.getNetwork(channelName);

		// Get the contract from the network.
		const contract = network.getContract(chaincodeName);



		let result;

		// Let's try a query operation (function).
		// This will be sent to just one peer and the results will be shown.
		console.log('\n--> Evaluate Transaction: GetAssetsByRange, function returns assets in a specific range from asset1 to before asset6');
		result = await contract.evaluateTransaction('GetAssetsByRange', start, end);
		console.log(`*** Result: ${prettyJSONString(result.toString())}`);
  writeResponse(res,result.toString(),200)

	} finally {
		// Disconnect from the gateway when the application is closing
		// This will close all connections to the network
		gateway.disconnect();
	}


})

app.get('/asset/:id', async function (req,res) { 
	const id = req.params.id; 
	const gateway = new Gateway();

	try {
	
		await gateway.connect(ccp, {
			wallet,
			identity: userId,
			discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
		});

		// Build a network instance based on the channel where the smart contract is deployed
		const network = await gateway.getNetwork(channelName);

		// Get the contract from the network.
		const contract = network.getContract(chaincodeName);

		let result;
		// console.log(`\n--> Evaluate Transaction: ReadAsset, function returns information about an asset with ID(${id})`);
		result = await contract.evaluateTransaction('ReadAsset', id);
		//console.log(`*** Result: ${prettyJSONString(result.toString())}`);
		 var r = JSON.parse(result.toString())
		// var d = aes256.decrypt(r.checkSum,r.location)
	    // console.log(d.toString('utf8'))
		writeResponse(res,r,200)
		

	} finally {
		// Disconnect from the gateway when the application is closing
		// This will close all connections to the network
		gateway.disconnect();
	}
	
})

app.post('/', async (req,res) => {

	req.body.assetID = uuidv4()
	req.body.checkSum = uuidv4()
	req.body.created = new Date()
	//var buffer = Buffer.from(req.body.location)
	var encryptedPlainText = aes256.encrypt(req.body.checkSum,req.body.location)
	req.body.location = encryptedPlainText

		const gateway = new Gateway();

		try {
		
			await gateway.connect(ccp, {
				wallet,
				identity: userId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);

			// // Initialize a set of asset data on the channel using the chaincode 'InitLedger' function.
			// // This type of transaction would only be run once by an application the first time it was started after it
			// // deployed the first time. Any updates to the chaincode deployed later would likely not need to run
			// // an "init" type function.
			// if (!skipInit) {
			// 	try {
			// 		console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
			// 		await contract.submitTransaction('InitLedger');
			// 		console.log('*** Result: committed');
			// 	} catch (initError) {
			// 		// this is error is OK if we are rerunning this app without restarting
			// 		console.log(`******** initLedger failed :: ${initError}`);
			// 	}
			// } else {
			// 	console.log('*** not executing "InitLedger');
			// }

			let result;

				// Now let's try to submit a transaction.
			// This will be sent to both peers and if both peers endorse the transaction, the endorsed proposal will be sent
			// to the orderer to be committed by each of the peer's to the channel ledger.
			console.log('\n--> Submit Transaction: CreateAsset, creates new asset with arguments',req.body);
			await contract.submitTransaction('CreateAsset', req.body.assetID,req.body.origin,req.body.originId,
			req.body.typeId,req.body.checkSum,req.body.location,req.body.created,req.body.name);
			console.log('*** Result: committed');
      		writeResponse(res,req.body.assetID,200)

			//   res.setHeader('Content-Type', 'text/plain')
			//   res.write('you posted:\n')
			//   res.end(JSON.stringify(req.body, null, 2))
			// var d = aes256.decrypt(req.body.checkSum, req.body.location)
			// console.log(d.toString('utf8'))

		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}
  
})

app.get('/asset/fields/query', async (req, res) => {
	var queryText  = req.get('queryText')
	var bookmark = req.get("bookmark") === undefined ? undefined: req.get('bookmark')

	console.log(`bookmark is ${bookmark}`)
	const gateway = new Gateway();

	try {
	
		await gateway.connect(ccp, {
			wallet,
			identity: userId,
			discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
		});

		// Build a network instance based on the channel where the smart contract is deployed
		const network = await gateway.getNetwork(channelName);

		// Get the contract from the network.
		const contract = network.getContract(chaincodeName);

		let result;
		console.log('\n--> Evaluate Transaction: QueryAssetsWithPagination, function returns "Max" assets');
		if(bookmark === undefined){
			result = await contract.evaluateTransaction('QueryAssetsWithPagination', `{"selector":${queryText}, "use_index":["_design/indexOwnerDoc", "indexOwner"]}`, '1', ``);
		}else{
			result = await contract.evaluateTransaction('QueryAssetsWithPagination', `{"selector":${queryText}, "use_index":["_design/indexOwnerDoc", "indexOwner"]}`, '1', `${bookmark}`);
		}
	

		console.log(`*** Result: ${prettyJSONString(result.toString())}`);
		// Recover the bookmark from previous query. Normally it will be inside a variable.
		var r = JSON.parse(result.toString())
		writeResponse(res,r,200)
		

	} finally {
		// Disconnect from the gateway when the application is closing
		// This will close all connections to the network
		gateway.disconnect();
	}
	
})


app.get('/asset/fields/query/history', async (req, res) => {
	var queryText  = req.get('queryText')
	var bookmark = req.get("bookmark") === undefined ? undefined: req.get('bookmark')

	console.log(`bookmark is ${bookmark}`)
	const gateway = new Gateway();

	try {
	
		await gateway.connect(ccp, {
			wallet,
			identity: userId,
			discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
		});

		// Build a network instance based on the channel where the smart contract is deployed
		const network = await gateway.getNetwork(channelName);

		// Get the contract from the network.
		const contract = network.getContract(chaincodeName);

		let result;
		// console.log('\n--> Evaluate Transaction: QueryAssetsWithPagination, function returns "Max" assets');
		if(bookmark === undefined){
			result = await contract.evaluateTransaction('QueryAssetsWithPagination', `{"selector":${queryText}, "use_index":["_design/indexCheckSumDoc", "indexCheckSum"]}`, '10', ``);
		}else{
			result = await contract.evaluateTransaction('QueryAssetsWithPagination', `{"selector":${queryText}, "use_index":["_design/indexCheckSumDoc", "indexCheckSum"]}`, '10', `${bookmark}`);
		}
	

		console.log(`*** Result: ${prettyJSONString(result.toString())}`);
		// Recover the bookmark from previous query. Normally it will be inside a variable.
		var r = JSON.parse(result.toString())
		res.setHeader('Content-Type','application/json')
		writeResponse(res,r,200)
		

	} finally {
		// Disconnect from the gateway when the application is closing
		// This will close all connections to the network
		gateway.disconnect();
	}
	
})

app.post('/sample/put/data', upload.single('file') ,async function(req,res){

	    // req.file is the `avatar` file
    // req.body will hold the text fields, if there were any
    try {
        // req.file is the `fileUpload` file
        // req.body will hold the text fields, if there were any
        // handle success
		console.log(`creating asset ->`, req.body.assetID, req.body.name)
		var myLocation = req.file.originalname.concat(',',req.file.mimetype,',',req.file.path)
		var key = req.body.checkSum.concat('salt!1966',req.body.assetID)

		var encryptedPlainText = aes256.encrypt(key,myLocation)
		req.body.location = encryptedPlainText
	
			const gateway = new Gateway();
	
			try {
			
				await gateway.connect(ccp, {
					wallet,
					identity: userId,
					discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
				});
	
				// Build a network instance based on the channel where the smart contract is deployed
				const network = await gateway.getNetwork(channelName);
	
				// Get the contract from the network.
				const contract = network.getContract(chaincodeName);
	
				let result;
	
					// Now let's try to submit a transaction.
				// This will be sent to both peers and if both peers endorse the transaction, the endorsed proposal will be sent
				// to the orderer to be committed by each of the peer's to the channel ledger.
				//console.log('\n--> Submit Transaction: CreateAsset, creates new asset with arguments',req.body);
				await contract.submitTransaction('CreateAsset', req.body.assetID,req.body.origin,req.body.originId,
				req.body.typeId,req.body.checkSum,req.body.location,req.body.created,req.body.name);
				console.log('*** Result: committed');
				  //writeResponse(res,req.body.assetID,200)
	
				//   res.setHeader('Content-Type', 'text/plain')
				//   res.write('you posted:\n')
				//   res.end(JSON.stringify(req.body, null, 2))
				// var d = aes256.decrypt(req.body.checkSum, req.body.location)
				// console.log(d.toString('utf8'))
	
			} finally {
				// Disconnect from the gateway when the application is closing
				// This will close all connections to the network
				gateway.disconnect();
			}


		//saveEncryptedFile(req.file.buffer, './uploads', `./uploads/${req.file.originalname}`)
		res.setHeader('Content-Type','application/json')
        return res.status(200).json({ message: 'Asset uploaded successfully!' ,assetID: req.body.assetID});
      } catch (error) {
        // handle error
        return res.status(400).json({ message: error.message });
      }
})


app.get('/asset/location/:id', async function (req,res) { 
	const id = req.params.id; 
	const gateway = new Gateway();

	try {
	
		await gateway.connect(ccp, {
			wallet,
			identity: userId,
			discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
		});

		// Build a network instance based on the channel where the smart contract is deployed
		const network = await gateway.getNetwork(channelName);

		// Get the contract from the network.
		const contract = network.getContract(chaincodeName);

		let result;
		// console.log(`\n--> Evaluate Transaction: ReadAsset, function returns information about an asset with ID(${id})`);
		result = await contract.evaluateTransaction('ReadAsset', id);
		 var r = JSON.parse(result.toString())

	    var key = r.checkSum.concat('salt!1966',r.assetID)
		var d = aes256.decrypt(key,r.location)
        var loc = d.toString('utf8').split(',')
	    console.log('decrypted location =>',loc[0])
		var myReturn ={
			assetID: r.assetID,
			originId: r.originId,
			created: r.created, 
			typeId: r.typeId,
			origin: r.origin,
			name: r.name,
			location: r.location,
			originalname: loc[0],
			mineType: loc[1],
			url: loc[2]

		}
		res.setHeader('Content-Type','application/json')
		writeResponse(res,myReturn,200)
		

	} finally {
		// Disconnect from the gateway when the application is closing
		// This will close all connections to the network
		gateway.disconnect();
	}
	
})
app.get('/asset/view/location/:id', async function (req,res) { 
	const id = req.params.id; 
	const gateway = new Gateway();

	try {
	
		await gateway.connect(ccp, {
			wallet,
			identity: userId,
			discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
		});

		// Build a network instance based on the channel where the smart contract is deployed
		const network = await gateway.getNetwork(channelName);

		// Get the contract from the network.
		const contract = network.getContract(chaincodeName);

		let result;
		// console.log(`\n--> Evaluate Transaction: ReadAsset, function returns information about an asset with ID(${id})`);
		result = await contract.evaluateTransaction('ReadAsset', id);
		 var r = JSON.parse(result.toString())

	    var key = r.checkSum.concat('salt!1966',r.assetID)
		var d = aes256.decrypt(key,r.location)
        var loc = d.toString('utf8').split(',')
	    console.log('decrypted location =>',loc[0])
		var myFile = createReadStream(loc[2])
		var stat = statSync(loc[2])
		res.setHeader('Content-Length',stat.size)
		res.setHeader('Content-Type',loc[1])
		res.setHeader('Content-Disposition',`inline: filename=${loc[0]}`)
		res.set('Cache-Control', 'no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0');
		myFile.pipe(res)
	} finally {
		// Disconnect from the gateway when the application is closing
		// This will close all connections to the network
		gateway.disconnect();
	}
	
})

app.get('/wallet', async function(req,res) {
		const list = await wallet.list()
	
		const adminIdentity  = await wallet.get(list[0])
		const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
		const userInfo = await provider.getUserContext(adminIdentity, list[7]);
		// console.log('admin Identity =>', adminIdentity)
		// console.log('provider =>', provider)
		var u = JSON.parse(userInfo.toString())
		const cert = new X509Certificate(u.enrollment.identity.certificate)
		console.log('user info =>', cert)

		res.setHeader('Content-Type','application/json')
		writeResponse(res,list,200)
})

app.post(`/wallet/create`, async (req,res) =>{

	try{
		//console.log(req.body)
		ccp = buildCCPOrg1();

		// build an instance of the fabric ca services client based on
		// the information in the network configuration
	 	caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');
		 await registerAndEnrollUser2(caClient, wallet, mspOrg1, req.body.email, 'org1.department1');

	}catch(error){
		console.info(`${req.body.email} wallet's already exist`)
	}
	res.setHeader('Content-Type','application/json')
	writeResponse(res,[],200)
})



app.listen(port, async () => {

  try {

   ccp = buildCCPOrg1();

		// build an instance of the fabric ca services client based on
		// the information in the network configuration
	 caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

   		// setup the wallet to hold the credentials of the application user
		wallet = await buildWallet(Wallets, walletPath);

			try{
			// in a real application this would be done on an administrative flow, and only once
			await enrollAdmin(caClient, wallet, mspOrg1);

			// in a real application this would be done only when a new user was required to be added
			// and would be part of an administrative flow
			await registerAndEnrollUser(caClient, wallet, mspOrg1, userId, 'org1.department1');
			} catch(error) {
			 console.info(`admin and ${userId} wallet's already exist`)
			}

    console.log(`SBIR POC SaaS listening on port ${port}`)

  } catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
		process.exit(1);
	}

 
 
})