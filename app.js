
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
"function getUSDTLiquidity() view returns(uint256)",
"event PriceUpdated(uint256 price)"
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
  
  // ✅ 1. load data FIRST
  await loadData();

  // ✅ 2. get current price
  let trcPrice = await ico.usdPrice();
  trcPrice = Number(ethers.utils.formatUnits(trcPrice,18));

  // ✅ 3. initialize chart (ONLY ONCE)
  setInitialChart(trcPrice);

  // ✅ 4. start listening to events
  listenToEvents();
}


function listenToEvents(){

  if(!ico) return;

  // remove old listeners
  ico.removeAllListeners("PriceUpdated");

  ico.on("PriceUpdated", (price) => {

    let formatted = Number(
      ethers.utils.formatUnits(price,18)
    );

    // =========================
    // INSTANT TEXT PRICE UPDATE
    // =========================
    document.getElementById("trcPrice").innerText =
      "$" + formatted.toFixed(2);

    // =========================
    // INSTANT WALLET VALUE UPDATE
    // =========================
    let bal = parseFloat(
      document.getElementById("trcBalance").innerText
    ) || 0;

    document.getElementById("trcValue").innerText =
      "$" + (bal * formatted).toFixed(2);

    // =========================
    // CHART UPDATE
    // =========================
    updateChart(formatted);

  });

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

// ================= POL LIQUIDITY =================
let contractPOL = await ico.getContractPOLBalance();
contractPOL = Number(ethers.utils.formatEther(contractPOL));

document.getElementById("polLiquidity").innerText =
  contractPOL.toFixed(4);


// ================= TRC LIQUIDITY =================
// IMPORTANT: direct TRC contract (no ico.token)
let trcContract = new ethers.Contract(TRC, erc20ABI, signer);

let trcLiquidity = await trcContract.balanceOf(ICO);
trcLiquidity = Number(ethers.utils.formatUnits(trcLiquidity, 18));

document.getElementById("trcLiquidity").innerText =
  trcLiquidity.toFixed(4);

  
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
// PERFECT LEFT -> RIGHT CURVE INTRO
// then live smooth events
// Replace FULL old chart section
// =======================

let chart, series;
let displayedPrice = 0;
let targetPrice = 0;

let chartStarted = false;
let introRunning = false;
let introFinished = false;


// =======================
// CREATE CHART
// =======================
window.addEventListener("load", () => {

  const chartContainer =
    document.getElementById("chart");

  chart = LightweightCharts.createChart(chartContainer,{
    width: chartContainer.clientWidth,
    height: 400,

    layout:{
      background:{ color:"#111" },
      textColor:"#DDD"
    },

    grid:{
      vertLines:{ color:"#222" },
      horzLines:{ color:"#222" }
    },

    timeScale:{
      timeVisible:true,
      secondsVisible:false
    },

    rightPriceScale:{
      autoScale:true,
      scaleMargins:{
        top:0.20,
        bottom:0.20
      }
    }
  });

  series = chart.addLineSeries({
    color:"#00eaff",
    lineWidth:3
  });

});


// =======================
// CONNECT WALLET INTRO
// 0 -> current price in 2 sec
// no price label until reached
// =======================
function setInitialChart(price){

  if(!series) return;

  targetPrice = Number(price);
  displayedPrice = 0;

  chartStarted = true;
  introRunning = true;
  introFinished = false;

  let now = Math.floor(Date.now()/1000);

  // hide live label during intro
  series.applyOptions({
    lastValueVisible:false,
    priceLineVisible:false
  });

  let points = [];
  let totalFrames = 20; // 20 frames = 2 sec
  let frame = 0;

  let introTimer = setInterval(()=>{

    frame++;

    let progress = frame / totalFrames;

    // smooth curve easing
    let curve =
      targetPrice * (1 - Math.pow(1-progress,3));

    points.push({
      time: now - (totalFrames - frame),
      value: Number(curve.toFixed(6))
    });

    series.setData(points);

    if(frame >= totalFrames){

      clearInterval(introTimer);

      displayedPrice = targetPrice;

      // show price label now
      series.applyOptions({
        lastValueVisible:true,
        priceLineVisible:true
      });

      chart.timeScale().fitContent();

      introRunning = false;
      introFinished = true;
    }

  },100); // 100ms x 20 = 2 sec
}



// =======================
// UPDATE TARGET PRICE
// =======================
function updateChart(newPrice){

  targetPrice = Number(newPrice);

}



// =======================
// LIVE EVENT MOVEMENT
// after intro only
// =======================
setInterval(()=>{

  if(!chartStarted) return;
  if(introRunning) return;
  if(!introFinished) return;

  let now = Math.floor(Date.now()/1000);

  let diff = targetPrice - displayedPrice;

  if(Math.abs(diff) < 0.0001){

    displayedPrice = targetPrice;

  }else{

    // smooth event move
    displayedPrice += diff * 0.18;

  }

  series.update({
    time: now,
    value: Number(displayedPrice.toFixed(6))
  });

},1000);



// =======================
// AUTO REFRESH
// =======================
setInterval(()=>{
  if(user) loadData();
},60000);



// =======================
// RESIZE
// =======================
window.addEventListener("resize", () => {

  if(!chart) return;

  const container =
    document.getElementById("chart");

  chart.resize(
    container.clientWidth,
    container.clientHeight
  );

});
