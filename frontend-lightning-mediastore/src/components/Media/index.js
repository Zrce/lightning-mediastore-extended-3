import React, { useState, useEffect } from "react";
//import ReactDOM from "react-dom";
import QRCode from "react-qr-code";
import { requestProvider } from 'webln';


const media = [
  {
    name: "Succulent (photo)",
    price: 200,
    source: "01.jpg",
    invoice: "",
    status: false,
    buyButton: false,
    fileDownloadUrl: ""
  },
  {
    name: "Melbourne (photo)",
    price: 200,
    source: "02.jpg",
    invoice: "",
    status: false,
    buyButton: false,
    fileDownloadUrl: ""
  },
  {
    name: "Madayaka",
    price: 1000,
    source: "03.jpg",
    invoice: "",
    status: false,
    buyButton: false,
    fileDownloadUrl: ""
  }
]

const Media = (props) => {
  const [mediaList, setMedia] = useState(media);
  useEffect(() => [props.invoice, props.fileDownloadUrl])

  const generateInvoiceAndCheck = async (source, price) => {
    let webln;
    try {
      webln = await requestProvider();
    } catch (err) {
      console.log(err.message)
    }
    
    const data = await (await fetch(`/generate-invoice/${source}/${price}`)).json()

    //open stream an check if invoice is paid
    isInvoicePaid(data) 

    if (webln) {
      // Call webln functions
      //const requestInvoiceResponse = await webln.makeInvoice({amount: price});
      const sendPaymentResponse = await webln.sendPayment(data.paymentRequest);
      console.log(data)
      console.log(sendPaymentResponse)

    } else {
      // No webln fallback
      const updateMedia = mediaList.map((m) => {
        if (m.source === source) {
          const updatedMedia = {
            ...m,
            invoice: data.paymentRequest,
            buyButton: true,
            checkButton: false
          };
          return updatedMedia;
        }
        return m;
      });
      await setMedia(updateMedia);
    }
  }

  //is the invoice paid 
  async function isInvoicePaid(data) {
    const dataInvoiceStream = await (await fetch(`/check-invoice-steam/${data.paymentRequest}`)).json()

    if (dataInvoiceStream.settled === true) {
      console.log("settled === true")

      const resGetContent =  await getContent(dataInvoiceStream.memo)
      const updateMedia = mediaList.map((m) => {
          if (m.source === dataInvoiceStream.memo) {
          return {
              ...m,
              status: true,
              invoice: 'Thanks',
              checkButton: false,
              fileDownloadUrl: resGetContent
          };
          }
          return m;
      });
      await setMedia(updateMedia);
    }
  }

  //Get contet for the download
  async function getContent(source) {
    return await fetch(`/file/${source}`)
      .then(res => res.blob())
      .then(blob => URL.createObjectURL(blob))
  }

  return (
    <div>
    { mediaList.map((m) => {
      return(
        <div key={m.source}>
          <div style={{margin:'auto', width:'80%'}}>
            <h1>{m.name}</h1>
            <p>Price: {m.price} sats</p>
            <img src={"assets/" + m.source + "small.jpg"} height="220px" alt={m.name} />
            <br /><br />
            <span style={{padding: '10px', color: 'white', backgroundColor: m.status ? 'green' : 'red'}} type="button">{m.status ? 'paid' : 'not paid yet'}</span>
            <br /><br />
            <button disabled={m.buyButton} style={{padding: '10px'}} type="button" onClick={ () => { generateInvoiceAndCheck(m.source, m.price) } }>Buy</button>
            {m.buyButton && <><br /><br /><QRCode value={m.invoice} /></>}
            {m.buyButton && <><br /><br /><textarea style={{ resize: "none" }} rows="9" cols="32" value={m.invoice} readOnly></textarea></>} 
            {m.status && <><br /><br /><a href={m.fileDownloadUrl} rel="noreferrer" target="_blank">View</a> <a href={m.fileDownloadUrl} rel="noreferrer" target="_blank" download>Download</a></>} 
          </div>
        </div>
      )})
    }
    </div>
  )
}

export default Media