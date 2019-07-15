const Splitter = artifacts.require("./Splitter.sol");

contract("Splitter", accounts => {
    // accounts
    const owner = accounts[0];
    const sender = accounts[1];
    const receiver1 = accounts[2];
    const receiver2 = accounts[3];
    const otherAddress = accounts[4];

    beforeEach(async () => {
        SplitterInstance = await Splitter.new();
    })

    describe("Test splitting functionality", async() => {
        it("Should split even amount between two receivers", async() => {
            // Send 100 wei to split function
            const amount = 100; 
            await SplitterInstance.splitFunds(receiver1, receiver2, {from: sender, value: amount});

            // get balances
            const receiver1Balance = (await SplitterInstance.balances(receiver1)).toNumber();
            const receiver2Balance = (await SplitterInstance.balances(receiver2)).toNumber();

            assert.equal(receiver1Balance, amount / 2, "Receiver 1 didn't get correct amount")
            assert.equal(receiver2Balance, amount / 2, "Receiver 2 didn't get correct amount")
        });

        it("Should split odd amounts and credit 1 wei to the senders balance", async () => {
            // Send 101 wei to split function
            const amount = 101; 
            await SplitterInstance.splitFunds(receiver1, receiver2, {from: sender, value: amount});

            // get balances
            const senderBalance = (await SplitterInstance.balances(sender)).toNumber();
            const receiver1Balance = (await SplitterInstance.balances(receiver1)).toNumber();
            const receiver2Balance = (await SplitterInstance.balances(receiver2)).toNumber();

            assert.equal(senderBalance, 1, "Didn't credit sender with 1 wei")
            assert.equal(receiver1Balance, (amount -1) / 2, "Receiver 1 didn't get correct amount")
            assert.equal(receiver2Balance, (amount -1) / 2, "Receiver 2 didn't get correct amount")
        });
    });

    describe("Test withdrawals", async () => {
        beforeEach("Split funds", async () => {
            const amount = 100;
            await SplitterInstance.splitFunds(receiver1, receiver2, {from: sender, value: amount});
        });

        it("Receiver 1 should be able to withdraw funds, balance should be zero after withdrawal", async () => {
            const amount = web3.utils.toBN(100);

            // calculate expected amount
            ethBeforeWithdrawal = web3.utils.toBN(await web3.eth.getBalance(receiver1));

            txLog = await SplitterInstance.withdrawFunds({ from: receiver1 });
            gasUsed = web3.utils.toBN(txLog.receipt.gasUsed);
            gasPrice = web3.utils.toBN((await web3.eth.getTransaction(txLog.tx)).gasPrice)
            txCost = web3.utils.toBN(gasPrice).mul(gasUsed);

            ethExpected = ethBeforeWithdrawal.add(amount.div(web3.utils.toBN(2))).sub(txCost);

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