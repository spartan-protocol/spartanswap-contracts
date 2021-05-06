
//iBEP20 Interface
pragma solidity 0.8.3;


interface iSYNTH {
    function genesis() external view returns(uint);
    function totalMinted() external view returns(uint);
    function LayerONE()external view returns(address);
}
