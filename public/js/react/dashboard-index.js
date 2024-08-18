class ActivityCard extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            content: "",
            repColor: "inherit"
        }
    }

    delete() {
        if(!confirm("You are about to delete a reply.")) return

        fetch('/api/reply', {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                trid: this.props.feed._id
            }),
        })
        .then(res => res.json())
        .then(res => {
            if(res.success) this.props.deleteActivityCard(this.props.feed._id)
            else alert(res.reason || 'Unknown error occured...')
        })
        .catch(e => {
            alert("Error occured")
            throw e
        })
    }

    verify() {
        if(!confirm("You are about to verify a reply.")) return

        fetch('/api/reply/verify', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                trid: this.props.feed._id
            }),
        })
        .then(res => res.json())
        .then(res => {
            if(res.success) this.props.deleteActivityCard(this.props.feed._id)
            else alert(res.reason || 'Unknown error occured...')
        })
        .catch(e => {
            alert("Error occured")
            throw e
        })
    }

    async componentDidMount() {
        let content = await HTMLToOembed(this.props.feed.content, { fileDomainWhitelist: true })
        this.setState({content})

        if(this.props.feed.account.reputation > 0) this.setState({repColor: "var(--green)"})
        else if(this.props.feed.account.reputation < 0) this.setState({repColor: "var(--red)"})

        this.setState({postTime: TimeStamp.Beautify(this.props.feed.date)})
    }

    render(){
        return (
            <div className="activitycard round border1 padding">
                <div className="controls verticalCenter gapchildrenx" style={{float: "right"}}>
                    { this.props.feed.verified === false && <p className="green" onClick={this.verify.bind(this)} title="Verify">✅</p>}
                    { this.props.feed.isLowerRanked && <p className="red" onClick={this.delete.bind(this)} title="Delete">🗑️</p> }
                </div>
                <p className="activityHeader">
                    <img className="pfp" src={this.props.feed.account.profilepicture}/>
                    <div>
                        <a href={`/profile?uid=${this.props.feed.account._id}`} className={this.props.feed.account.highestRole}>{this.props.feed.account.username} </a>
                        | <a href={`/profile/reputation?uid=${this.props.feed.account._id}`} style={{color: this.state.repColor}}>{this.props.feed.account.reputation} </a>
                        <span>| {this.state.postTime}</span>
                    </div>
                    {this.props.feed.isOP ? "Created a new thread" :
                        <React.Fragment>
                        <a href={`/t/${this.props.feed.tid}?r=${this.props.feed._id}`}>
                            {"trid" in this.props.feed ? "Commented" : "Replied"}
                        </a> to thread 
                        </React.Fragment>
                    }
                    {":"} 
                    <a href={`/t/${this.props.feed.tid}`}> <span className="threadTitle">{this.props.feed.threadTitle}</span></a>
                </p>
                <div className="threadContent" dangerouslySetInnerHTML={{__html: this.state.content}}></div>
            </div>
        )
    }
}

class ActivityFeed extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            feed: [],
            moreFeedAvailable: false,
        }
    }

    loadActivityFeed() {
        let urlParams = new URLSearchParams(this.props.url.substring(this.props.url.indexOf("?")))
        if(this.state.feed.length > 0) urlParams.append("trid", this.state.feed[this.state.feed.length - 1]._id)

        fetch(`${this.props.url.substring(0,this.props.url.indexOf("?"))}?${urlParams}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        })
        .then(res => res.json())
        .then(res => {
            this.setState({
                //Feed appends
                feed: [...this.state.feed, ...res.feed],
                moreFeedAvailable: res.moreFeedAvailable
            })
        })
    }

    deleteActivityCard(trid) {
        this.setState({
            feed: this.state.feed.filter(obj => obj._id !== trid)
        })
    }

    componentDidMount() {
        this.loadActivityFeed()
    }

    render() {
        return (
            <div className="gapchildren globalactivitycontainer">
                <h2>{this.props.title}</h2>
                {this.props.description && <p>{this.props.description}</p>}
                <div>
                    { 
                    this.state.feed.length <= 0 ? <p>No activity found...</p> :
                    this.state.feed.map((feed) => <ActivityCard key={feed._id} feed={feed} deleteActivityCard={this.deleteActivityCard.bind(this)}/> )
                    }
                </div>
                {this.state.moreFeedAvailable && <button className="border1 button btnLoadMore" onClick={this.loadActivityFeed.bind(this)}>Load More</button>}
            </div>
        );
    }
}

// Render the React component inside the #root div
ReactDOM.render(
    <React.Fragment>
        <ActivityFeed 
        title="Unverified Activity Feed" 
        description="These posts may have been made by a bot and require verification before they're publicly displayed" 
        url='/api/account/activity?uid=0&unverified=true'/>
        <ActivityFeed 
        title="Global Activity Feed" 
        description="Unfiltered list of all created threads and replies on the forum"
        url='/api/account/activity?uid=0'/>
    </React.Fragment>,
    document.getElementById('root')
);