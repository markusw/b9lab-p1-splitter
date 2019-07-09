pragma solidity ^0.5.0;

import "./Stoppable.sol";

contract Splitter is Stoppable {

    address payable public alice;
    address payable public bob;
    address payable public carol;

    event LogFundsSplit(address split1, address split2, uint amount);

    constructor(address payable _bob, address payable _carol) public {
        alice = msg.sender;
        bob = _bob;
        carol = _carol;
    }

    function splitFunds() public payable onlyIfRunning returns(bool success) {
        require(bob != address(0x0) && carol != address(0x0), "Avoid losing Ether");
        require(msg.value > 0, "Needs ether");

        if (msg.value % 2 != 0) {
            alice.transfer(1);  // refund 1 wei if split amount is odd
        }

        bob.transfer(address(this).balance / 2);
        carol.transfer(address(this).balance);

        emit LogFundsSplit(bob, carol, msg.value);

        return true;
    }
}