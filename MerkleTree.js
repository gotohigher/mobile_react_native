import CryptoJS from 'crypto-js';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

function calculateHash(value) {
  const hash = CryptoJS.SHA256(value).toString();
  return hash;
}
  
// MerkleNode class
class MerkleNode {
  constructor(value, leftNode = null, rightNode = null) {
    this.value = value;
    this.leftNode = leftNode;
    this.rightNode = rightNode;
  }
}

// MerkleTree class
export default class MerkleTree {
  constructor(values) {
    this.nodes = [[], []];

    for (let value of values) {
      let hashValue = calculateHash(value);
      this.nodes[0].push(new MerkleNode(hashValue));
    }

    this.buildTree();
  }

  buildTree() {
    let level = 0;

    while (this.nodes[level].length > 1) {
      if (!this.nodes[level + 1]) {
        this.nodes[level + 1] = [];
      }

      while (this.nodes[level].length > 0) {
        const leftNode = this.nodes[level].shift();
        const rightNode = this.nodes[level].length ? this.nodes[level].shift() : null;
        const value = calculateHash((leftNode?.value || "") + (rightNode?.value || ""));

        this.nodes[level + 1].push(new MerkleNode(value, leftNode, rightNode));
      }

      level++;
    }
  }

  get root() {
    return this.nodes[this.nodes.length - 1][0];
  }
}