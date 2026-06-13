package com.networth.service;

import com.networth.exception.ResourceNotFoundException;
import com.networth.model.document.UserSettingsDocument;
import com.networth.model.document.UserDocument;
import com.networth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserDocument getById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }

    public UserDocument updateSettings(String id, UserSettingsDocument settings) {
        UserDocument user = getById(id);
        user.setSettings(settings);
        return userRepository.save(user);
    }

    public UserDocument updateProfile(String id, String firstName, String lastName) {
        UserDocument user = getById(id);
        if (firstName != null) user.setFirstName(firstName);
        if (lastName != null) user.setLastName(lastName);
        return userRepository.save(user);
    }
}
