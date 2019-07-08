pragma solidity ^0.5.0;

import "./Owned.sol";

contract Stoppable is Owned {

    bool isRunning;

    event LogPausedContract(address sender);
    event LogResumedContract(address sender);

    modifier onlyIfRunning {
        require(isRunning, "Is not running");
        _;
    }

    constructor() public {
        isRunning = true;
    }

    function pauseContract() public onlyOwner onlyIfRunning returns(bool success) {
        isRunning = false;
        emit LogPausedContract(msg.sender);
        return true;
    }

    function resume() public onlyOwner returns(bool success) {
        require(!isRunning, "Is already running");
        isRunning = true;
        emit LogResumedContract(msg.sender);
        return true;
    }
}