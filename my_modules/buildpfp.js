module.exports = function(dbpfp){
    if(typeof dbpfp === "string" && dbpfp.startsWith("https://")) return dbpfp
    else return process.env.FORUM_URL + "/images/avatars/" + (dbpfp || "anovatar.png")
}