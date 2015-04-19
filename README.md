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

    hero:$heroId:challenges      - list of challenges a player has created
    hero:$heroId:deeds           - list of deeds a player has done
    challenge:$id:hero           - the creator of this challenge
    challenge:$id:sounds         - list of urls to sound clips
    challenge:availables         - list of available challenges
    challenge:counter            - counter for challange ids
    
challenge sound list is open to the creator


*when creating a challenge*

* create challenge id 
  * `$id = INCR challenge:counter`
  * `SET challenge:$id $id`
* associate challenge id with session id
  * `LPUSH hero:$heroId:games $id`
* (recordings take place)
* associate sound clip url with challenge
  * `LPUSH challenge:$challengeId:sounds 'http://s3.example.aws.blah'`
  

*when doing a deed*

* get challenge sound urls
  * `LPUSH