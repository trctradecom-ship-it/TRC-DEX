
const ICO = "0x4cadD2bF6d7d2Df5CD252177cd59E0ed1f63D4AD"; 
const TRC = "0x56620a4c9667375577B9D543440c3EFE7Ca75673";
const USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";

let provider, signer, ico, trc, user, usdt, USDT_DECIMALS;

const icoABI = [
"function usdPrice() view returns(uint256)",
"function getLatestPrice() view returns(uint256)",
"function buy() payable",
"function sell(uint256)",
"function getLastSellTime(address) view returns(uint256)",
"function SELL_COOLDOWN() view returns(uint256)",
"function buyWithUSDT(uint256)",
"function sellForUSDT(uint256)",
"function getUSDTLiquidity() view returns(uint256)"
];

const erc20ABI = [
"function balanceOf(address) view returns(uint256)",
"function approve(address,uint256) returns(bool)",
"function allowance(address,address) view returns(uint256)",
"function decimals() view returns(uint8)"
];


// ========================== HANDLE TRANSACTIONS ==========================
async function handleTx(tx){
  try{
    document.getElementById("status").innerHTML =
      `<span class="tx-pending">⏳ Waiting for confirmation...</span>`;

    const sent = await tx;

    document.getElementById("status").innerHTML =
    `<a href="https://polygonscan.com/tx/${sent.hash}" target="_blank"
    style="color:gold;font-weight:bold;">
    🔄 Transaction Pending (View)
    </a>`;

    // ⚡ FAST CONFIRM (1 block)
    const receipt = await provider.waitForTransaction(sent.hash, 1);

    if(receipt.status === 1){
      document.getElementById("status").innerHTML =
        `<span class="tx-success">✅ Transaction Confirmed</span>`;

      loadData();
    }else{
      document.getElementById("status").innerHTML =
        `<span class="tx-fail">❌ Transaction Failed</span>`;
    }

  }catch(e){
    document.getElementById("status").innerHTML =
      `<span class="tx-fail">❌ Transaction Failed</span>`;
  }
}


// CONNECT WALLET
async function connectWallet(){

await ethereum.request({method:'eth_requestAccounts'});

provider = new ethers.providers.Web3Provider(window.ethereum);
signer = provider.getSigner();

user = await signer.getAddress();

document.getElementById("walletAddress").innerText = user;

ico = new ethers.Contract(ICO, icoABI, signer);
trc = new ethers.Contract(TRC, erc20ABI, signer);
usdt = new ethers.Contract(USDT, erc20ABI, signer);
USDT_DECIMALS = await usdt.decimals();
loadData();

}


// LOAD DATA
async function loadData(){

let trcBal = await trc.balanceOf(user);
let polBal = await provider.getBalance(user);

let trcPrice = await ico.usdPrice();
let polPrice = await ico.getLatestPrice();

trcBal = Number(ethers.utils.formatUnits(trcBal,18));
polBal = Number(ethers.utils.formatEther(polBal));
trcPrice = Number(ethers.utils.formatUnits(trcPrice,18));
polPrice = Number(polPrice)/1e8;

document.getElementById("trcBalance").innerText = trcBal.toFixed(4);
document.getElementById("polBalance").innerText = polBal.toFixed(4);

document.getElementById("trcPrice").innerText = "$"+trcPrice.toFixed(2);
document.getElementById("polPrice").innerText = "$"+polPrice.toFixed(2);

document.getElementById("trcValue").innerText =
"$"+(trcBal*trcPrice).toFixed(2);

updateChart(trcPrice);

loadCooldown();

let usdtBal = await usdt.balanceOf(user);
usdtBal = Number(ethers.utils.formatUnits(usdtBal,6));

document.getElementById("usdtBalance").innerText = usdtBal.toFixed(2);
// ================= USDT LIQUIDITY =================
let usdtLiquidity = await ico.getUSDTLiquidity();

usdtLiquidity = Number(
  ethers.utils.formatUnits(usdtLiquidity, USDT_DECIMALS)
);

document.getElementById("usdtLiquidity").innerText =
  usdtLiquidity.toFixed(2);
// =================================================
  
}


// BUY
async function buyTRC(){
try{
let amount=document.getElementById("buyAmount").value;

if(!amount || Number(amount) <= 0){
  alert("Enter valid amount");
  return;
}
await handleTx(
  ico.buy({ value: ethers.utils.parseEther(amount) })
);
}catch(e){
document.getElementById("status").innerText="Transaction Failed";
}
}


// APPROVE
async function approveTRC(){
try{
await handleTx(
  trc.approve(ICO, ethers.constants.MaxUint256)
);
}catch(e){
document.getElementById("status").innerText="Approval Failed";
}
}


// SELL
async function sellTRC(){
try{
let amount = document.getElementById("sellAmount").value;
if(!amount || Number(amount) <= 0){
  alert("Enter valid amount");
  return;
}
await handleTx(
  ico.sell(ethers.utils.parseEther(amount))
);
}catch(e){
document.getElementById("status").innerText="Transaction Failed";
}
}

// ================= USDT FUNCTIONS =================

// APPROVE USDT
async function approveUSDT(){
try{
await handleTx(
  usdt.approve(ICO, ethers.constants.MaxUint256)
);
}catch(e){
document.getElementById("status").innerText="USDT Approval Failed";
}
}

// BUY WITH USDT
async function buyWithUSDT(){
try{
let amount = document.getElementById("buyUSDT").value;
if(!amount || Number(amount) <= 0){
  alert("Enter valid USDT");
  return;
}

if(Number(amount) <= 0){
alert("Enter valid USDT");
return;
}

let usdtAmount = ethers.utils.parseUnits(amount, USDT_DECIMALS);
await handleTx(
  ico.buyWithUSDT(usdtAmount)
);

}catch(e){
document.getElementById("status").innerText="USDT Buy Failed";
}
}

// SELL FOR USDT
async function sellForUSDT(){
try{
let amount = document.getElementById("sellUSDT").value;

if(Number(amount) <= 0){
alert("Enter valid USDT");
return;
}

let usdtAmount = ethers.utils.parseUnits(amount, USDT_DECIMALS);

await handleTx(
  ico.sellForUSDT(usdtAmount)
);

}catch(e){
document.getElementById("status").innerText="USDT Sell Failed";
}
}


// MAX SELL (1%)
async function maxSell(){

let trcBal = await trc.balanceOf(user);

let maxTRC = trcBal.div(100);

let trcPrice = await ico.usdPrice();
trcPrice = Number(ethers.utils.formatUnits(trcPrice,18));

let polPrice = await ico.getLatestPrice();
polPrice = Number(polPrice)/1e8;

let maxTRCReadable =
Number(ethers.utils.formatUnits(maxTRC,18));

let usdValue = maxTRCReadable * trcPrice;

let polAmount;

if(usdValue < 1){
polAmount = 1 / polPrice;
}else{
polAmount = usdValue / polPrice;
}

document.getElementById("sellAmount").value =
polAmount.toFixed(4);

}

// MAX SELL FOR USDT (1%)
async function maxSellUSDT(){

let trcBal = await trc.balanceOf(user);

// 1% of TRC
let maxTRC = trcBal.div(100);

// get TRC price
let trcPrice = await ico.usdPrice();
trcPrice = Number(ethers.utils.formatUnits(trcPrice,18));

// USDT = $1 → so USD = USDT
let maxTRCReadable =
Number(ethers.utils.formatUnits(maxTRC,18));

let usdValue = maxTRCReadable * trcPrice;

// minimum $1 rule
let usdtAmount;

if(usdValue < 1){
usdtAmount = 1;
}else{
usdtAmount = usdValue;
}

// set input
document.getElementById("sellUSDT").value =
usdtAmount.toFixed(2);

}



// COOLDOWN TIMER
let cooldownStarted=false;

async function loadCooldown(){

if(cooldownStarted) return;

cooldownStarted=true;

let last=await ico.getLastSellTime(user);
let cd=await ico.SELL_COOLDOWN();

let next=Number(last)+Number(cd);

setInterval(()=>{

let now=Math.floor(Date.now()/1000);

let left=next-now;

if(left<=0){
document.getElementById("cooldown").innerText="Ready";
return;
}

let h=Math.floor(left/3600);
let m=Math.floor((left%3600)/60);
let s=left%60;

document.getElementById("cooldown").innerText=
h+"h "+m+"m "+s+"s";

},1000);

}


// =======================
// CHART (UNCHANGED)
// =======================

const chartContainer = document.getElementById("chart");
const chart = LightweightCharts.createChart(chartContainer,{
width: chartContainer.clientWidth,
height: 400,

layout:{
background:{color:"#111"},
textColor:"#DDD"}
,

grid:{
vertLines:{color:"#222"},
horzLines:{color:"#222"}
},

timeScale:{
timeVisible:true,
secondsVisible:false,
rightBarStaysOnScroll:true
},

rightPriceScale:{
autoScale:true,
scaleMargins:{
top:0.25,
bottom:0.25
}
}

});

const series = chart.addLineSeries({
color:"#00eaff",
lineWidth:3
});

chart.timeScale().fitContent();

let lastPrice = 0;

function updateChart(price){

price = Number(price);

let now = Math.floor(Date.now()/1000);

if(lastPrice === 0){
lastPrice = price;
}

let smoothPrice = lastPrice + (price - lastPrice) * 0.05;

series.update({
time: now,
value: smoothPrice
});

lastPrice = smoothPrice;

}


// AUTO REFRESH
setInterval(()=>{
if(user) loadData();
},60000);


// RESIZE
window.addEventListener("resize", () => {
  chart.resize(
    chartContainer.clientWidth,
    chartContainer.clientHeight
  );
});
