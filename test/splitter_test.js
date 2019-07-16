const Splitter = artifacts.require("./Splitter.sol");
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

            // test event
            assert(txObj.logs.length > 0, "Logs empty");
            assert.equal(txObj.logs[0].event, "LogSplitFunds", "Didn't emit right event");
            // check for correct args
            assert.equal(txObj.logs[0].args.sender, sender, "Logged wrong sending address");
            assert.equal(txObj.logs[0].args.receiver1, receiver1, "Logged wrong address for receiver1");
            assert.equal(txObj.logs[0].args.receiver2, receiver2, "Logged wrong address for receiver2");
            assert.equal(txObj.logs[0].args.amount.toString(), amount.toString(), "Logged wrong amount");

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
            ethBeforeWithdrawal = toBN(await web3.eth.getBalance(receiver1));

            txLog = await SplitterInstance.withdrawFunds({ from: receiver1 });
            gasUsed = toBN(txLog.receipt.gasUsed);
            gasPrice = toBN((await web3.eth.getTransaction(txLog.tx)).gasPrice)
            txCost = toBN(gasPrice).mul(gasUsed);

            ethExpected = ethBeforeWithdrawal.add(amount.div(toBN(2))).sub(txCost);

            // get actual account balance
            ethAfterWithdrawal = await web3.eth.getBalance(receiver1);
            
            assert.equal(ethExpected.toString(), ethAfterWithdrawal.toString(), "Didn't withdraw correct amount");

            balanceAfter = await SplitterInstance.balances(receiver1);
            assert.equal(balanceAfter, "0", "funds left after withdrawal")

        });
    });
    describe("Pausing and changing owner", async() => {
        it("Should be possible to change owner", async() => {
            // change owner to otherAddress
            await SplitterInstance.changeOwner(otherAddress, {from: owner});

            // get owner of contract
            newOwner = await SplitterInstance.getOwner();

            assert.equal(otherAddress, newOwner, "Owner not changed correctly");
        });

        it("Should be possible to pause contract", async() => {
            // pause the contract
            await SplitterInstance.pauseContract({from: owner});
            // get status
            contractStatus = await SplitterInstance.getIsRunning();

            assert.equal(contractStatus, false);
        })

        it("Non-owner shouldn't be able to change contract owner", async() => {
            try {
                await SplitterInstance.changeOwner(otherAddress, {from: receiver1});
            }
            catch (err) {
                assert.equal(err.reason, "Sender not authorized");
            }
        })

        it("Non-owner shouldn't be able to pause or resume the contract", async() => {
            try {
                await SplitterInstance.pauseContract({from: receiver1});
            }
            catch (err) {
                assert.equal(err.reason, "Sender not authorized");
            }
        });
    });
});