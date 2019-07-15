require("file-loader?name=../index.html!../index.html");
const Web3 = require("web3");
const Promise = require("bluebird");
const truffleContract = require("truffle-contract");
const $ = require("jquery");

const splitterJson = require("../../build/contracts/Splitter.json");

if (typeof web3 !== 'undefined') {
    window.web3 = new Web3(web3.currentProvider);
} else {
    window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545')); 
}

const Splitter = truffleContract(splitterJson);
Splitter.setProvider(web3.currentProvider);

async function splitFunds() {
    try {
        const instance = await Splitter.deployed();
        accounts = await web3.eth.getAccounts();
        const alice = accounts[1];
        const bob = accounts[2];
        const carol = accounts[3];
        const value = web3.utils.toWei($('input[name="amount"]').val(), "Ether")

        const tx = await instance.splitFunds(bob, carol, {from: alice, value: value})

        const receipt = tx.receipt;
        if (!receipt.status) {
            console.error(receipt);
            $('#statusMessage').html('Error in transaction');
        } else {
            console.log(receipt);
            $('#statusMessage').html('Transaction successful, txHash: ' + receipt.transactionHash);
        }
    } catch (err) {
        console.error(err);
    }
};

window.addEventListener('load', async() => {
    try {
        accounts = await web3.eth.getAccounts();
        if (accounts.length == 0) {
            $("#balance").html("N/A");
            throw new Error("No account to transact");
        }
        accountAlice = accounts[1];
        accountBob = accounts[2];
        accountCarol = accounts[3];

        instance = await Splitter.deployed();
        // get contract balances
        balanceAlice = web3.utils.fromWei(await instance.balances.call(accountAlice), "Ether");
        balanceBob = web3.utils.fromWei(await instance.balances.call(accountBob), "Ether");
        balanceCarol = web3.utils.fromWei(await instance.balances.call(accountCarol), "Ether");

        // get ETH Balance of Alice
        ethAlice = web3.utils.fromWei(await web3.eth.getBalance(accountAlice), "Ether");

        $("#balanceAlice").html(balanceAlice.toString(10));
        $("#balanceBob").html(balanceBob.toString(10));
        $("#balanceCarol").html(balanceCarol.toString(10));
        $("#ethAlice").html(ethAlice.toString(10));

        $("#send").click(splitFunds);

    } catch (err) {
        console.log(err);
    }
});
