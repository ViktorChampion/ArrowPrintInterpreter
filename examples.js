const examples = {
    'Hello World': `>"Hello, World"?@@`,
    'FizzBuzz': 
    `>0>{<100}>1+{;3}> v
   v        v
   >@@      >{;5}>>{;3}>"Fizz"?v
             v     v
             >:?   >           >{;5}>"Buzz"?v
                                v
                                >           >"\\n"?v
  ^                                               <`,
    'Calculator':`>"1st num: "?,"2nd num: "?,"Operator: "?,{="+"}>'+?@@
                                         v
                                         >{="-"}>'-?@@
                                          v
                                          >{="*"}>'*?@@
                                           v
                                           >{="/"}>';?@@
                                            v
                                            >{="^"}>'**?@@
                                             v
                                             >"Idk"?@@`,
    'Random number':
`
>1 10\`"N"?>"umber: "?,{=}>"Right!"?@@
                      v
                      >"Wrong, n"?'v
          ^                       <
`
}