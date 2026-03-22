
module.exports = {
    getMaxID: function (data) {
        let ids = data.map(e => {
            return e.id
        })
        return Math.max(...ids)
    }
}