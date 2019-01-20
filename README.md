# Lock-your-mercedes-with-Alexa

## Use Case:
Lock your car using your Amazon Alexa.

## Reason for choosing this Use Case:
1. ### Get and set information:
Since the experimental API is a little bit limited in forms of sending commands to the vehicle I chose the only Use Case, that not only retrieves information but also sends commands out to the vehicle.
2. ### Real world application

## Problems I had:
I had some problems regarding the OAuth 2.0 Authentification that the API uses. 
1. For me it wasnt clear how a user should sign in/give his consent to the scopes my application uses. Since Alexa has no browser where a user can sign in to his Mercedes account I wasnt sure how to deal with this problem. I *solved* this problem by doing this step maunally. A user (in this case a developer) can click the link I provided in my code and can give his consent manually.
2. When the user gives his consent to the scopes of my application he/she gets redirected to a https://localhost website with a code attribute. This code attribute is the authentification code that is used to retrieve an access token from the mercedes server. This redirect firstly is a temporary redirect (https code 302). Modern browsers can deal with this pretty easily, but Alexa cant. When I tried to do the redirect via a https request it didnt work because the first redirect is temporary and then you get redirected to the https://localhost website. This i a problem, since I am not able to retrieve the authentification code inside the program. The *solution* to this is, that every time you use the LockMyMercedes intent on your Alexa you have to manually provide an authetification code.
