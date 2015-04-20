# ld32_b
starting over! unconventaional weapon, unconventional game







## gameplay

player and wizard. player calls a phone number, wizard is standing by 

* This call will be recorded. Recordings are made publically available through our online game.
* Spirit of striking voice, my word be heard! The army of Rhythus is here, they stand before our keep.
  Our walls have fallen, our men have died, our last reserve protects the king.
  Striking voice, the myth is true, your power is known far and wide. A great screeching call of yours is what we need to survive.
  Voice Spirit, I promptly request. STRIKE DOWN OUR FOES! 
* [RECORD]
* wizard
** 

complete deeds to gain levels. lvl 2+ can create challenges.

000 deeds - lvl1
003 deeds - lvl2
006 deeds - lvl3
012 deeds - lvl4
024 deeds - lvl5
048 deeds - lvl6
096 deeds - lvl7
192 deeds - lvl8

## new game session logic


- create unique 4 digit session number & tell the player
- pull a random game
- play the game


## db

note: "session" and "hero" are used initerchangably

needs to be able to...

- create session id number 
- pull a random game
- create game entry for session
- associate game id with session
- retrieve a session's completed games
- store sound filenames in game

there are challenges and deeds
a deed is an attempt to win the challenge

    hero:$heroId                     - shows that hero exists. contains hero id
    hero:$heroId:training            - squire training level. used as req.ld32.recordProgress for /call/hero/create
    hero:$heroId:savecode            - contains savecode for this hero
    hero:$heroId:challenges          - list of challenges a player has created
    hero:$heroId:deeds               - list of deeds a player has done
    hero:$heroId:level               - the hero's level
    hero:counter                     - counter for deriving hero Ids
    hero:call:$callId                - contains heroId. Maps active call UUID to hero. TTL 1h
    challenge:$challengeId:hero      - the creator of this challenge
    challenge:$challengeId:sounds    - list of urls to sound clips
    challenge:availables             - list of available challenges
    challenge:counter                - counter for deriving challange ids
    


*when creating a challenge*

* create challenge id 
  * `$id = INCR challenge:counter`
  * `SET challenge:$id $id`
* associate challenge id with session id
  * `LPUSH hero:$heroId:games $id`
 

*when creating a hero*

* create hero id
  (one id is secret. it's the user's code to retrieve their hero)
  (one id is not so secret)
  * `$id = INCR hero:conter`
  * `SET hero:$id $id`
* associate call uuid with hero
  * `SET hero:$heroId:call $callId` 
  

*when adding recording to database*

* associate sound clip url with challenge
  * `LPUSH challenge:$challengeId:sounds 'http://s3.example.aws.blah'`
  

*when doing a deed*

* get challenge sound urls
  * `LPUSH `
* compute hero's level based on completed deeds
  *  
  


## misc notes

call body blob
    
    {
       Direction: 'inbound',
        From: '1xxxxxxxxxx',
        CallerName: '+1xxxxxxxxxx',
        BillRate: '0.00850',
        To: '1xxxxxxxxxx',
        CallUUID: '4721ade6-e6fe-11e4-bad6-c5ffead37627',
        CallStatus: 'ringing',
        Event: 'StartApp'
    }

## todo

* remove call associations when hanging up
* set expiry for heroes. something like a year. renew expiration every time the heroe logs in.