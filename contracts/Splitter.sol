pragma solidity ^0.5.0;

import "./SafeMath.sol";
import "./Stoppable.sol";

contract Splitter is Stoppable {
    using SafeMath for uint;

    mapping(address => uint) public balances;

    event LogSplitFunds(
        address indexed sender,
        address indexed receiver1,
        address indexed receiver2,
        uint amount
    );

    event LogWithdrawn(
        address indexed withdrawAddress,
        uint amount
    );

    constructor(bool initialRunState) public Stoppable(initialRunState) {}

    function splitFunds(address receiver1, address receiver2) public payable onlyIfRunning returns(bool success) {
        require(receiver1 != address(0x0) && receiver2 != address(0x0), "receiving address can't be empty");
        require(msg.value > 0, "Needs ether");

        if (msg.value.mod(2) != 0) {
            balances[msg.sender] = balances[msg.sender].add(1); // add 1 wei to senders balance if amount is odd
        }

        balances[receiver1] = balances[receiver1].add(msg.value.div(2));
        balances[receiver2] = balances[receiver2].add(msg.value.div(2));

        emit LogSplitFunds(msg.sender, receiver1, receiver2, msg.value);

        return true;
    }

    function withdrawFunds() public onlyIfRunning returns(bool success) {
        uint withdrawAmount = balances[msg.sender];
        require(withdrawAmount > 0, "No balance to withdraw");

        balances[msg.sender] = 0;

        emit LogWithdrawn(msg.sender, withdrawAmount);
        msg.sender.transfer(withdrawAmount);

        return true;
    }
}