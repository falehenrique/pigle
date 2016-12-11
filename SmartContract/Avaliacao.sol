pragma solidity ^0.4.2;

contract AvaliacaoEstabelecimento {

  address owner;
  uint qtdAvaliacao;

  function AvaliacaoEstabelecimento() {
    owner = msg.sender;
  }

  //function for user vote. input is a string choice
  function avaliar(uint decisao) returns (bool) {
    if (msg.sender != owner) {
      return false;
    }
    if (decisao == 1)  {
      qtdAvaliacao += 1;
    } else if (decisao == 0) {
      qtdAvaliacao -= 1;
    }

    return true;
  }

  function get() constant returns (uint) {
    //if (msg.sender != owner) throw;
    return qtdAvaliacao;
  }
}