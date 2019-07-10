pragma solidity ^0.5.0;

import "./Stoppable.sol";

contract Splitter is Stoppable {

    mapping(address => uint) public balances;

    event LogSplitFunds(
        address indexed sender,
        address indexed receiver1,
        address indexed receiver2,
        uint amount
    );

    event LogWithdraw(
        address indexed withdrawAddress,
        uint amount
    );

    function splitFunds(address receiver1, address receiver2) public payable onlyIfRunning returns(bool success) {
        require(receiver1 != address(0x0) && receiver2 != address(0x0), "receiving address can't be empty");
        require(msg.value > 0, "Needs ether");

        uint amount = msg.value;

        if (msg.value % 2 != 0) {
            balances[msg.sender] += 1;  // add 1 wei to senders balance if amount is odd
            amount -= 1;
        }

        balances[receiver1] += amount / 2;
        balances[receiver2] += amount / 2;

        emit LogSplitFunds(msg.sender, receiver1, receiver2, msg.value);

        return true;
    }

    function withdrawFunds() public onlyIfRunning returns(bool success) {
        require(balances[msg.sender] > 0, "No balance to withdraw");

        uint withdrawAmount = balances[msg.sender];
        balances[msg.sender] = 0;
        msg.sender.transfer(withdrawAmount);

        emit LogWithdraw(msg.sender, withdrawAmount);

        return true;
    }
}