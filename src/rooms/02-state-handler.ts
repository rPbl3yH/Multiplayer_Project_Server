import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
    @type("int16")
    maxHp = 0;

    @type("int16")
    hp = 0;

    @type("uint16")
    loss = 0;

    @type("number")
    speed = 0;

    planeSize = 10;

    @type("number")
    pX = Math.floor(Math.random() * this.planeSize) - this.planeSize / 2;

    @type("number")
    pY = 0;

    @type("number")
    pZ = Math.floor(Math.random() * this.planeSize) - this.planeSize / 2;

    @type("number")
    vX = 0;

    @type("number")
    vY = 0;

    @type("number")
    vZ = 0;

    @type("number")
    rX = 0;

    @type("number")
    rY = 0;
}

export class State extends Schema {
    @type({ map: Player })
    players = new MapSchema<Player>();

    something = "This attribute won't be sent to the client-side";

    createPlayer(sessionId: string, data: any) {
        const player = new Player();
        player.speed = data.speed;
        player.maxHp = data.maxHp;
        player.hp = data.maxHp;

        this.players.set(sessionId, player);
    }

    removePlayer(sessionId: string) {
        this.players.delete(sessionId);
    }

    movePlayer (sessionId: string, data: any) {
        const player = this.players.get(sessionId);

        player.pX = data.pX;
        player.pY = data.pY;
        player.pZ  = data.pZ;

        player.vX = data.vX;
        player.vY = data.vY;
        player.vZ  = data.vZ;
    
        player.rX = data.rX;
        player.rY = data.rY;
    }
}

export class StateHandlerRoom extends Room<State> {
    maxClients = 2;

    onCreate (options) {
        console.log("StateHandlerRoom created!", options);

        this.setState(new State());

        this.onMessage("move", (client, data) => {
            // console.log("StateHandlerRoom received message from", client.sessionId, ":", data);
            this.state.movePlayer(client.sessionId, data);
        });

        this.onMessage("shoot", (client, data) => {
            this.broadcast("Shoot", data, {except: client});
        })

        this.onMessage("damage", (client, data) => {
            const clientId = data.id;
            const player = this.state.players.get(clientId);

            let hp = player.hp - data.value;
            
            if(hp > 0){
                player.hp = hp;
                return;
            }

            player.loss++;
            player.hp = player.maxHp;
            
            for (let i = 0; i < this.clients.length; i++) {
                const otherClient = this.clients[i];
                
                if(otherClient.id != clientId){
                    continue;
                }

                const planeSize = player.planeSize;
                const x = Math.floor(Math.random() * planeSize) - planeSize / 2;
                const z = Math.floor(Math.random() * planeSize) - planeSize / 2;

                const restartData = JSON.stringify({x, z})

                otherClient.send("Restart", restartData);
            }
        })
    }

    onAuth(client, options, req) {
        return true;
    }

    onJoin (client: Client, data: any) {
        if(this.clients.length > 1){
            this.lock();
        }

        client.send("hello", "world");
        this.state.createPlayer(client.sessionId, data);
    }

    onLeave (client) {
        this.state.removePlayer(client.sessionId);
    }

    onDispose () {
        console.log("Dispose StateHandlerRoom");
    }
}
