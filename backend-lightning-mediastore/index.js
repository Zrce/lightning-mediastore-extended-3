require('dotenv').config()

const express = require('express')
const app = express()
const port = process.env.PORT || 3001
const path = require('path');
const { createLnRpc } = require('@radar/lnrpc')

process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA:ECDHE-RSA-AES128-GCM-SHA256'

let lnRpcClient

app.get('/', (req, res) => {
  res.send('running!')
})

app.get("/getinfo", function (req, res) {
  lnRpcClient.getInfo({}, function(err, response) {
      if (err) {
        console.log('Error: ' + err);
      }
      res.json(response);
    });
});

app.get("/generate-invoice/:source/:price", function (req, res) {
  let request = { 
    value: req.params['price'],
    memo: req.params['source'],
    expiry: '120'
  };

  lnRpcClient.addInvoice(request, function(err, response) {
    //console.log(response)
    res.json(response);
  });
});

app.get("/check-invoice-steam/:paymentRequest", function (req, res) {
  let dataReturn = {} 
  let stream = lnRpcClient.subscribeInvoices({}) //This seems to be right place to subscribeInvoices
  
  stream.on('data', (data) => {
    console.log("### DATA")
    console.log(data)
    //console.log(data.settled)

    //This check for the correct invoice is important. If not doen all connected users will be marked as setteled 
    if (data.settled === true && data.paymentRequest === req.params['paymentRequest']) { 
      dataReturn = data 
      stream.destroy()
    }
  });

  stream.on('close', () =>  {
    console.log("### CLOSE")
    res.json(dataReturn)
  });
});

app.get('/file/:source', function (req, res, next) {
  var options = {
    dotfiles: 'deny',
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true
    }
  }

  var fileName = path.join(path.join(__dirname, 'static'))
  res.download(path.join(__dirname, 'static', req.params['source']), req.params['source'], options, function (err) {
    if (err) {
      next(err)
    } else {
      console.log('Sent:', fileName)
    }
  })
})

const initClient = async () => {
  lnRpcClient = await createLnRpc({
    server: process.env.HOST_PORT,
    tls: false,
    //tls: process.env.TLS_CERT,
    //cert: process.env.TLS_CERT,
    macaroon: process.env.MACAROON,
  });

  try {
    const getInfoResponse = await lnRpcClient.getInfo();
    console.log(getInfoResponse);
  } catch (error) {
    console.error(error);
  }
}

initClient().then(() => {
  console.log('Lightning node connected!');
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  })
})



