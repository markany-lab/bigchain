var FileBit = /** @class */ (function () {
    function FileBit() {
        this.bits = [];
    }
    FileBit.prototype.init = function (fileChunkSize) {
        for (let i = 0; i < fileChunkSize; i++) {
            this.bits[i] = 0;
        }
    };
    FileBit.prototype.setChunkBit = function (chunkNum) {
        this.bits[chunkNum - 1] = 1;
    };
    FileBit.prototype.setChunkBitRang = function (from, to) {
      for (let i = from; i <= to; i++) {
          this.bits[i - 1] = 1;
      }
    };
    FileBit.prototype.setChunkBitCompare = function (from, to) {
      if(from.length != to.length ) {
        return false;
      }
      let i = parseFloat( "0" )
      for ( i = 0; i < to.length; i++) {
        if( from[i] != to[i] ) {
          return false;
        }
      }
      return true;
    };
    FileBit.prototype.getCount = function () {
      let count = 0;
      for (let i = 0; i < this.bits.length; i++) {
          if( this.bits[i] == 1 ) {
            count++;
          }
      }
      return count;
    };
    FileBit.prototype.serializeChunk = function () {
        return this.bits.join('');
    };
    return FileBit;
}());

module.exports.getInstance = () => new FileBit();
