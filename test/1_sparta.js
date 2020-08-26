const { expect } = require("chai");
var Token1 = artifacts.require('./Token1')
var Sparta = artifacts.require('./Base')
const BigNumber = require('bignumber.js')
const truffleAssert = require('truffle-assertions')

function BN2Str(BN) { return ((new BigNumber(BN)).toFixed()) }
function getBN(BN) { return (new BigNumber(BN)) }

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

var token1; var sparta;
var acc0; var acc1; var acc2; var acc3; var acc4; var acc5;
const one = 10**18

before(async function() {
  accounts = await ethers.getSigners();
  acc0 = await accounts[0].getAddress()
  acc1 = await accounts[1].getAddress()
  acc2 = await accounts[2].getAddress()
  acc3 = await accounts[3].getAddress()
  acc4 = await accounts[4].getAddress()
  acc5 = await accounts[5].getAddress()

  token1 = await Token1.new();
  sparta = await Sparta.new();
  await token1.transfer(acc1, BN2Str(100000000 * one))
  await token1.transfer(acc2, BN2Str(100000000 * one))
  await token1.transfer(acc3, BN2Str(100000000 * one))
  await token1.transfer(acc4, BN2Str(100000000 * one))
  await token1.transfer(acc5, BN2Str(100000000 * one))
})

describe("Deploy", function() {
  it("Should deploy", async function() {
    expect(await sparta.name()).to.equal("SPARTAN PROTOCOL TOKEN");
    expect(await sparta.symbol()).to.equal("SPARTA");
    expect(BN2Str(await sparta.decimals())).to.equal('18');
    expect(BN2Str(await sparta.totalSupply())).to.equal('0');
    expect(BN2Str(await sparta.totalCap())).to.equal(BN2Str(300000000 * one));
    expect(BN2Str(await sparta.emissionCurve())).to.equal('2048');
    expect(await sparta.emitting()).to.equal(false);
    expect(BN2Str(await sparta.currentEra())).to.equal('1');
    expect(BN2Str(await sparta.secondsPerEra())).to.equal('1');
    // console.log(BN2Str(await sparta.nextEraTime()));
    expect(await sparta.DAO()).to.equal(acc0);
    expect(await sparta.burnAddress()).to.equal("0x0000000000000000000000000000000000000001");
    expect(BN2Str(await sparta.getDailyEmission())).to.equal(BN2Str('0'));
  });
});

describe("Upgrade", function() {
    it("DAO list token", async function() {
        // console.log(await sparta.assetCount())
        expect(await sparta.isListed(token1.address)).to.equal(false);
        await sparta.listAssetWithClaim(token1.address, BN2Str(50000000 * one), BN2Str(one));
        expect(BN2Str(await sparta.getAdjustedClaimRate(token1.address))).to.equal(BN2Str(1000000000000000000));
        expect(BN2Str(await sparta.assetCount())).to.equal(BN2Str(1));
        expect(await sparta.isListed(token1.address)).to.equal(true);
        console.log(await sparta.allAssets())
        // expect(await sparta.allAssets()).to.deeplyEqual([ '0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F' ]);
      });

      it("DAO list token", async function() {
        await sparta.listAssetWithClaim(acc1, BN2Str(50000000 * one), BN2Str(one));
        await sparta.listAssetWithClaim(acc2, BN2Str(50000000 * one), BN2Str(one));
        await sparta.listAssetWithClaim(acc3, BN2Str(50000000 * one), BN2Str(one));
        await sparta.listAssetWithClaim(acc4, BN2Str(50000000 * one), BN2Str(one));
        console.log(BN2Str(await sparta.assetCount()))
        console.log(await sparta.allAssets())
        console.log(await sparta.assetsInRange('0', '3'))
        console.log(await sparta.assetsInRange('0', '9'))
      });

  it("Should upgrade acc1", async function() {
      // first, upgrade 50m
    expect(await sparta.mapMemberAsset_hasClaimed(acc1, token1.address)).to.equal(false);
    let balance = await token1.balanceOf(acc1)
    await token1.approve(sparta.address, balance, {from:acc1})
    expect(BN2Str(await token1.allowance(acc1, sparta.address))).to.equal(BN2Str(balance));
    await sparta.upgrade(token1.address, {from:acc1})
    expect(BN2Str(await sparta.totalSupply())).to.equal(BN2Str(50000000 * one));
    expect(BN2Str(await token1.balanceOf(acc1))).to.equal(BN2Str(50000000 * one));
    expect(BN2Str(await sparta.balanceOf(acc1))).to.equal(BN2Str(50000000 * one));
    expect(BN2Str(await sparta.getDailyEmission())).to.equal(BN2Str('48828125000000000000000'));
    expect(await sparta.mapMemberAsset_hasClaimed(acc1, token1.address)).to.equal(true);
  });
  it("Address Fails second time", async function() {
    await truffleAssert.reverts(sparta.upgrade(token1.address, {from:acc1}))
  });
  it("Should upgrade acc2", async function() {
    // first, upgrade 50m
    let balance = await token1.balanceOf(acc2)
    await token1.approve(sparta.address, balance, {from:acc2})
    await sparta.upgrade(token1.address, {from:acc2})
    expect(BN2Str(await sparta.totalSupply())).to.equal(BN2Str(100000000 * one));
    expect(BN2Str(await token1.balanceOf(acc2))).to.equal(BN2Str(50000000 * one));
    expect(BN2Str(await sparta.balanceOf(acc2))).to.equal(BN2Str(50000000 * one));
    expect(BN2Str(await sparta.getDailyEmission())).to.equal(BN2Str('97656250000000000000000'));
    });
    it("Should upgrade acc3", async function() {
    // first, upgrade 50m
    let balance = await token1.balanceOf(acc3)
    await token1.approve(sparta.address, balance, {from:acc3})
    await sparta.upgrade(token1.address, {from:acc3})
    expect(BN2Str(await sparta.totalSupply())).to.equal(BN2Str(150000000 * one));
    expect(BN2Str(await token1.balanceOf(acc3))).to.equal(BN2Str(50000000 * one));
    expect(BN2Str(await sparta.balanceOf(acc3))).to.equal(BN2Str(50000000 * one));
    expect(BN2Str(await sparta.getDailyEmission())).to.equal(BN2Str('146484375000000000000000'));
    });
    it("Should upgrade acc4", async function() {
    // first, upgrade 50m
    let balance = await token1.balanceOf(acc4)
    await token1.approve(sparta.address, balance, {from:acc4})
    await sparta.upgrade(token1.address, {from:acc4})
    expect(BN2Str(await sparta.totalSupply())).to.equal('187500000000000000000000000');
    expect(BN2Str(await token1.balanceOf(acc4))).to.equal('50000000000000000000000000');
    expect(BN2Str(await sparta.balanceOf(acc4))).to.equal('37500000000000000000000000');
    expect(BN2Str(await sparta.getDailyEmission())).to.equal(BN2Str('183105468750000000000000'));
    });
    it("Should upgrade acc5", async function() {
    // first, upgrade 50m
    let balance = await token1.balanceOf(acc5)
    await token1.approve(sparta.address, balance, {from:acc5})
    await sparta.upgrade(token1.address, {from:acc5})
    expect(BN2Str(await sparta.totalSupply())).to.equal('215625000000000000000000000');
    expect(BN2Str(await token1.balanceOf(acc5))).to.equal('50000000000000000000000000');
    expect(BN2Str(await sparta.balanceOf(acc5))).to.equal('28125000000000000000000000');
    expect(BN2Str(await sparta.getDailyEmission())).to.equal(BN2Str('210571289062500000000000'));
    });
});

describe("Be a valid ERC-20", function() {
  it("Should transfer From", async function() {
    await sparta.approve(acc4, "1000", {from:acc1}) 
    expect(BN2Str(await sparta.allowance(acc1, acc4))).to.equal('1000');
    await sparta.transferFrom(acc1, acc4, "1000", {from:acc4})
    expect(BN2Str(await sparta.balanceOf(acc4))).to.equal('37500000000000000000001000');
  });
  it("Should transfer to", async function() {
    await sparta.transferTo(acc4, "1000", {from:acc1}) 
    expect(BN2Str(await sparta.balanceOf(acc4))).to.equal('37500000000000000000002000');
  });
  it("Should burn", async function() {
    await sparta.burn("500", {from:acc4})
    expect(BN2Str(await sparta.balanceOf(acc4))).to.equal('37500000000000000000001500');
    expect(BN2Str(await sparta.totalSupply())).to.equal(BN2Str('215624999999999999999999500'));

  });
  it("Should burn from", async function() {
    await sparta.approve(acc2, "500", {from:acc4}) 
    expect(BN2Str(await sparta.allowance(acc4, acc2))).to.equal('500');
    await sparta.burnFrom(acc4, "500", {from:acc2})
    expect(BN2Str(await sparta.balanceOf(acc4))).to.equal('37500000000000000000001000');
    expect(BN2Str(await sparta.totalSupply())).to.equal(BN2Str('215624999999999999999999000'));

  });
});

describe("DAO Functions", function() {
  it("Non-DAO fails", async function() {
    await truffleAssert.reverts(sparta.startEmissions({from:acc1}))
  });
  it("DAO changeEmissionCurve", async function() {
    await sparta.changeEmissionCurve('1024')
    expect(BN2Str(await sparta.emissionCurve())).to.equal('1024');
  });
  it("DAO changeIncentiveAddress", async function() {
    await sparta.changeIncentiveAddress(acc3)
    expect(await sparta.incentiveAddress()).to.equal(acc3);
  });
  it("DAO changeDAO", async function() {
    await sparta.changeDAO(acc2)
    expect(await sparta.DAO()).to.equal(acc2);
  });
  it("DAO start emitting", async function() {
    await sparta.startEmissions({from:acc2})
    expect(await sparta.emitting()).to.equal(true);
  });

  it("DAO changeDAO", async function() {
    await sparta.changeDAO(acc3, {from:acc2})
    expect(await sparta.DAO()).to.equal(acc3);
  });
  
  it("Old DAO fails", async function() {
    await truffleAssert.reverts(sparta.startEmissions({from:acc2}))
  });
});

describe("Emissions", function() {
  it("Should emit properly", async function() {
    expect(BN2Str(await sparta.getDailyEmission())).to.equal(BN2Str('421142578124999999999998'));
    // await sleep(2000)
    await sparta.transfer(acc0, BN2Str(1000000 * one), {from:acc1})
    await sparta.transfer(acc1, BN2Str(1000000 * one), {from:acc0})
    expect(BN2Str(await sparta.currentEra())).to.equal('3');
    expect(BN2Str(await sparta.balanceOf(acc3))).to.equal(BN2Str('50843107700347900390624996'));
    expect(BN2Str(await sparta.getDailyEmission())).to.equal(BN2Str('422789272852241992950437'));
    
    await sleep(2000)
    await sparta.transfer(acc0, BN2Str(1000000 * one), {from:acc1})
    expect(BN2Str(await sparta.currentEra())).to.equal('4');
    expect(BN2Str(await sparta.balanceOf(acc3))).to.equal(BN2Str('51265896973200142383575433'));
    expect(BN2Str(await sparta.getDailyEmission())).to.equal(BN2Str('423615033150781528092918'));
  });

  it("DAO changeEraDuration", async function() {
    await sparta.changeEraDuration('200',{from:acc3})
    expect(BN2Str(await sparta.secondsPerEra())).to.equal('200');
  });
});
