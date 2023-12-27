
export function readIpLink(stdout){
    let res = {}

    let n = 1
    let cur = null

    function flush(){
        if(cur && cur.name) res[cur.name] = cur
        cur = {p:[]}
    }

    let lines = stdout.split('\n')

    let l = 0
    for(let line of lines){
        if(line){
            let predictStart = n+':'
            if(line.startsWith(predictStart)){
                flush()
    
                line = line.substring(n.toString().length+2)
    
                cur.n = n++
                l = 0
            }

            if(l==0){
                let div = line.split(':')
                cur.name = div[0]
                cur.p.push(div[1].split(' '))
            }
            else if(l==1){
                let div = line.split(' ').filter((e)=>{return e != ''})
                cur.p.push(div)
            }

            l++
        }
    }

    flush()

    return res
}