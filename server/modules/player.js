module.exports = function(cid, conn, name, pos = {}) {
    this.hp = 100;
    this.inventory = {};
    this.name = name;
    this.id = cid;
    this.conn = conn;
    this.position = pos || {
        x: 0,
        y: 0
    };
    this.index = -1;
    this.active = {};
    this.update = [];
}
