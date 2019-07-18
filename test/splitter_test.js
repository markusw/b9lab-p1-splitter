const Splitter = artifacts.require("./Splitter.sol");
const truffleAssert = require('truffle-assertions');
const { toBN } = web3.utils;

contract("Splitter", accounts => {
    // accounts
    const [owner, sender, receiver1, receiver2, otherAddress] = accounts;

    beforeEach("Get new Splitter instance before each test", async () => {
        SplitterInstance = await Splitter.new({from: owner});
    })

    describe("Test splitting functionality", async() => {
        it("Should split even amount between two receivers", async() => {
            // Send 100 wei to split function
            const amount = 100; 

            const txObj = await SplitterInstance.splitFunds(receiver1, receiver2, {from: sender, value: amount});

            truffleAssert.eventEmitted(txObj, "LogSplitFunds", { 
                sender: sender,
                receiver1: receiver1,
                receiver2: receiver2,
                amount: toBN(amount)
            });

            // get balances
            const receiver1Balance = (await SplitterInstance.balances(receiver1)).toString();
            const receiver2Balance = (await SplitterInstance.balances(receiver2)).toString();

            assert.equal(receiver1Balance, (amount / 2).toString(), "Receiver 1 didn't get correct amount")
            assert.equal(receiver2Balance, (amount / 2).toString(), "Receiver 2 didn't get correct amount")
        });

        it("Should split odd amounts and credit 1 wei to the senders balance", async () => {
            // Send 101 wei to split function
            const amount = 101; 
            await SplitterInstance.splitFunds(receiver1, receiver2, {from: sender, value: amount});

            // get balances
            const senderBalance = (await SplitterInstance.balances(sender)).toString();
            const receiver1Balance = (await SplitterInstance.balances(receiver1)).toString();
            const receiver2Balance = (await SplitterInstance.balances(receiver2)).toString();
            const amountExpected = ((amount -1) / 2).toString()

            assert.equal(senderBalance, "1", "Didn't credit sender with 1 wei")
            assert.equal(receiver1Balance, amountExpected, "Receiver 1 didn't get correct amount")
            assert.equal(receiver2Balance, amountExpected, "Receiver 2 didn't get correct amount")
        });
    });

    describe("Test withdrawals", async () => {
        beforeEach("Split funds before test", async () => {
            const amount = 100;
            await SplitterInstance.splitFunds(receiver1, receiver2, {from: sender, value: amount});
        });

        it("Receiver 1 should be able to withdraw funds, balance should be zero after withdrawal", async () => {
            const amount = toBN(100);

            // calculate expected amount
            const ethBeforeWithdrawal = toBN(await web3.eth.getBalance(receiver1));

            const txObj = await SplitterInstance.withdrawFunds({ from: receiver1 });
            const gasUsed = toBN(txObj.receipt.gasUsed);
            const gasPrice = toBN((await web3.eth.getTransaction(txObj.tx)).gasPrice)
            const txCost = toBN(gasPrice).mul(gasUsed);

            const ethExpected = ethBeforeWithdrawal.add(amount.div(toBN(2))).sub(txCost);

            // get actual account balance
            const ethAfterWithdrawal = await web3.eth.getBalance(receiver1);
            
            assert.equal(ethExpected.toString(), ethAfterWithdrawal.toString(), "Didn't withdraw correct amount");

            const balanceAfter = await SplitterInstance.balances(receiver1);
            assert.equal(balanceAfter, "0", "funds left after withdrawal")

            // test event
            truffleAssert.eventEmitted(txObj, "LogWithdrawn", (ev) => { 
                return ev.withdrawAddress == receiver1 && ev.amount == amount / 2;
            });
        });
    });
    describe("Changing owner", async() => {
        it("Should be possible to change owner", async() => {
            // change owner to otherAddress
            const txObj = await SplitterInstance.changeOwner(otherAddress, {from: owner});

            // get owner of contract
            const newOwner = await SplitterInstance.getOwner();

            assert.equal(otherAddress, newOwner, "Owner not changed correctly");

            // test event
            truffleAssert.eventEmitted(txObj, "LogChangeOwner", (ev) => { 
                return ev.sender == owner && ev.newOwner == otherAddress;
            });
        });

        it("Non-owner shouldn't be able to change contract owner", async() => {
            try {
                const txObj = await SplitterInstance.changeOwner(otherAddress, {from: receiver1});
                truffleAssert.eventNotEmitted(txObj, 'LogChangeOwner');
            }
            catch (err) {
                assert.equal(err.reason, "Sender not authorized");
            }
        });
    });

    describe("Pausing and killing contract", async() => {
        it("Should be possible to pause contract", async() => {
            // pause the contract
            const txObj = await SplitterInstance.pauseContract({from: owner});
            // get status
            const contractStatus = await SplitterInstance.isRunning();

            assert.equal(contractStatus, false);

            // test event
            truffleAssert.eventEmitted(txObj, "LogPausedContract", (ev) => { 
                return ev.sender == owner;
            });
        });
        
        it("Should be possible to kill contract", async() => {
            // pause then kill the contract
            await SplitterInstance.pauseContract({from: owner});
            const txObj = await SplitterInstance.killContract({from: owner});

            // test event
            truffleAssert.eventEmitted(txObj, "LogKilledContract", {sender: owner})

            // check if contract can be resumed
            try {
                await SplitterInstance.resume();
            } 
            catch (err) {
                assert.equal(err.reason, "Contract is killed");
            }

            assert.equal(await SplitterInstance.isRunning(), false);
        });

        it("Non-owner shouldn't be able to pause or resume the contract", async() => {
            try {
                const txObj = await SplitterInstance.pauseContract({from: receiver1});
                truffleAssert.eventNotEmitted(txObj, 'LogPausedContract');
            }
            catch (err) {
                assert.equal(err.reason, "Sender not authorized");
            }
        });
        
        it("Should not be possible to kill running contract", async() => {
            try {
                const txObj = await SplitterInstance.killContract({from: owner});
                truffleAssert.eventNotEmitted(txObj, 'LogKilledContract');
            }
            catch (err) {
                assert.equal(err.reason, "Is not paused");
            }
        });
    });
});