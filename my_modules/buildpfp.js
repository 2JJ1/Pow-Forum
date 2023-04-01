module.exports = function(dbpfp){
    if(typeof dbpfp === "string" && dbpfp.startsWith("https://")) return dbpfp
    else return "/images/avatars/" + (dbpfp || "anovatar.png")
}