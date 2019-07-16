require("file-loader?name=../index.html!../index.html");
const Web3 = require("web3");
const Promise = require("bluebird");
const truffleContract = require("truffle-contract");
const assert = require("assert");
const $ = require("jquery");

const splitterJson = require("../../build/contracts/Splitter.json");

async function splitFunds() {
    try {
        $("#error").html('');

        const instance = await Splitter.deployed();
        const accounts = await web3.eth.getAccounts();
        const alice = accounts[1];
        const bob = accounts[2];
        const carol = accounts[3];
        const value = web3.utils.toWei($('input[name="amount"]').val(), "Ether")

        // trial run with call to see if transaction will be successful
        assert(await instance.splitFunds.call(bob, carol, {from: alice, value: value}), 
        "Transaction will fail, didn't send");

        // Split funds
        const tx = await instance.splitFunds(bob, carol, {from: alice, value: value}).on(
            "transactionHash", 
            txHash => $("#status1").html('Transaction sent, waiting to confirm. txHash: ' + txHash));
        
        const receipt = tx.receipt;

        if (!receipt.status) {
            console.error(receipt);
            $("#error").html('Error in transaction: ' + receipt);
        } else if (receipt.logs[0].event != "LogSplitFunds") {
            console.error("Wrong event: " + receipt)
            $("#error").html('Wrong event: ' + receipt);
        } else {
            console.log(receipt);
            $("#status2").html('Transaction successful');
        }
    } catch (err) {
        console.error(err);
        $("#error").html('Splitting funds failed: ' + err.toString());
    }
};

window.addEventListener('load', async() => {
    if (typeof web3 !== 'undefined') {
        window.web3 = new Web3(web3.currentProvider);
    } else {
        window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545')); 
    }
    
    Splitter = truffleContract(splitterJson);
    Splitter.setProvider(web3.currentProvider);

    try {
        const accounts = await web3.eth.getAccounts();
        if (accounts.length == 0) {
            $("#balance").html("N/A");
            throw new Error("No account to transact");
        }
        const accountAlice = accounts[1];
        const accountBob = accounts[2];
        const accountCarol = accounts[3];

        const instance = await Splitter.deployed();
        // get contract balances
        const balanceAlice = web3.utils.fromWei(await instance.balances.call(accountAlice), "Ether");
        const balanceBob = web3.utils.fromWei(await instance.balances.call(accountBob), "Ether");
        const balanceCarol = web3.utils.fromWei(await instance.balances.call(accountCarol), "Ether");

        // get ETH Balance of Alice
        const ethAlice = web3.utils.fromWei(await web3.eth.getBalance(accountAlice), "Ether");

        $("#balanceAlice").html(balanceAlice.toString(10));
        $("#balanceBob").html(balanceBob.toString(10));
        $("#balanceCarol").html(balanceCarol.toString(10));
        $("#ethAlice").html(ethAlice.toString(10));

        $("#send").click(splitFunds);

    } catch (err) {
        console.log(err);
        $("#error").html(err.toString());
    }
});
