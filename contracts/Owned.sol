pragma solidity ^0.5.0;

contract Owned {
    address public owner;

    event LogChangeOwner(address sender, address newOwner);

    modifier onlyOwner {
        require(msg.sender == owner, "Sender not authorized");
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function changeOwner(address newOwner) public onlyOwner returns(bool success) {
        owner = newOwner;
        emit LogChangeOwner(msg.sender, newOwner);
        return true;
    }
}